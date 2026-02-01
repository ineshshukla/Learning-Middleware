"use client"

import { useState, useEffect, useRef } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Target, RefreshCw, Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://10.4.25.215:3000/kg/visualization"

interface ApiNode {
  id: string
  title: string
  description: string
  difficulty: number
  keywords: string[]
  module_ids: string[]
}

interface ApiEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
}

interface ApiModule {
  id: string
  title: string
  description: string
  total_los: number
  core_los: number
  finalized: boolean
}

interface ApiResponse {
  status: string
  data: {
    nodes: ApiNode[]
    edges: ApiEdge[]
    modules: ApiModule[]
    statistics: {
      total_learning_objectives: number
      total_modules: number
      total_prerequisites: number
      avg_difficulty: number
      max_depth: number
      finalized: boolean
    }
  }
}

interface GraphNode extends ApiNode {
  x: number
  y: number
  color: string
}

export default function CoursePage({ params }: { params: { id: string } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  // Fetch data from API
  useEffect(() => {
    const fetchApiData = async () => {
      try {
        setLoading(true)
        console.log('Fetching data from:', API_URL)
        const response = await fetch(API_URL)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: ApiResponse = await response.json()
        console.log('API Response:', data)
        setApiData(data)
        
        // Convert API nodes to graph nodes with positions
        if (data.data.nodes && data.data.nodes.length > 0) {
          const graphNodes: GraphNode[] = data.data.nodes.map((node, index) => {
            const angle = (index / data.data.nodes.length) * 2 * Math.PI
            const radius = Math.min(window.innerWidth / 4, 300)
            return {
              ...node,
              x: canvasRef.current ? canvasRef.current.width / 2 + Math.cos(angle) * radius : 0,
              y: canvasRef.current ? canvasRef.current.height / 2 + Math.sin(angle) * radius : 0,
              color: getDifficultyColor(node.difficulty)
            }
          })
          setNodes(graphNodes)
        }
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        console.error('Error fetching API data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchApiData()
  }, [])

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return '#3b82f6' // blue for easy
    if (difficulty <= 6) return '#f59e0b' // yellow for medium
    return '#ef4444' // red for hard
  }

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas || !apiData) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw edges first
    if (apiData.data.edges && apiData.data.edges.length > 0) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      
      apiData.data.edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)
        
        if (sourceNode && targetNode) {
          ctx.beginPath()
          ctx.moveTo(sourceNode.x, sourceNode.y)
          ctx.lineTo(targetNode.x, targetNode.y)
          ctx.stroke()
        }
      })
    }
    
    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath()
      ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI)
      ctx.fillStyle = node.color
      ctx.fill()
      ctx.strokeStyle = selectedNode?.id === node.id ? '#000' : '#fff'
      ctx.lineWidth = selectedNode?.id === node.id ? 3 : 2
      ctx.stroke()
      
      // Draw node labels
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title,
        node.x,
        node.y + 30
      )
    })
  }

  useEffect(() => {
    if (nodes.length > 0) {
      drawGraph()
    }
  }, [nodes, selectedNode, apiData])

  useEffect(() => {
    const handleResize = () => {
      if (nodes.length > 0) {
        // Recalculate positions on resize
        const newNodes = nodes.map((node, index) => {
            const angle = (index / nodes.length) * 2 * Math.PI
            const radius = Math.min(window.innerWidth / 4, 300)
            return {
              ...node,
              x: canvasRef.current ? canvasRef.current.width / 2 / window.devicePixelRatio + Math.cos(angle) * radius : 0,
              y: canvasRef.current ? canvasRef.current.height / 2 / window.devicePixelRatio + Math.sin(angle) * radius : 0,
            }
        })
        setNodes(newNodes)
        drawGraph()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [apiData])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      return distance <= 15
    })
    
    setSelectedNode(clickedNode || null)
  }

  const refreshData = () => {
    setLoading(true)
    setError(null)
    // Re-trigger the useEffect
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-[#181818]">
        <Header />
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <span className="text-white">Loading knowledge graph...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 min-h-screen bg-[#181818]">
        <Header />
        <div className="max-w-7xl mx-auto space-y-6">
          <Card className="bg-[#282828]">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-white">Failed to Load Knowledge Graph</h3>
                <p className="text-white">Error: {error}</p>
                <div className="space-y-2">
                  <p className="text-sm text-white">API Endpoint: {API_URL}</p>
                  <p className="text-sm text-white">
                    This could be due to network connectivity or the API server being unavailable.
                  </p>
                </div>
                <Button onClick={refreshData} className="flex items-center space-x-2 bg-[#a020f0] hover:bg-[#8c1acc] text-white">
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 min-h-screen bg-[#181818]">
      <Header />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Course {params.id} - Knowledge Graph
            </h1>
            <p className="text-white">
              Interactive visualization of learning objectives and their relationships
            </p>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm" className="flex items-center space-x-2 border-white text-white hover:bg-[#a020f0]">
            <RefreshCw className="h-4 w-4 text-white" />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-[#282828]">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Target className="mr-2 h-5 w-5 text-white" />
                  Knowledge Graph Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="w-full h-96 border border-white/20 rounded-lg cursor-pointer bg-[#181818]"
                  style={{ minHeight: '400px' }}
                />
                <div className="mt-4 flex items-center space-x-4 text-sm text-white">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Easy (1-3)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Medium (4-6)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Hard (7-10)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {selectedNode && (
              <Card className="bg-[#282828]">
                <CardHeader>
                  <CardTitle className="text-sm text-white">{selectedNode.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Badge 
                      className={
                        selectedNode.difficulty <= 3 ? 'bg-blue-500 text-white' :
                        selectedNode.difficulty <= 6 ? 'bg-yellow-500 text-white' :
                        'bg-red-500 text-white'
                      }
                    >
                      Difficulty: {selectedNode.difficulty}/10
                    </Badge>
                  </div>
                  <p className="text-sm text-white">{selectedNode.description}</p>
                  {selectedNode.keywords && selectedNode.keywords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white">Keywords:</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs text-white border-white">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {apiData && apiData.data.statistics && (
              <Card className="bg-[#282828]">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <BookOpen className="mr-2 h-5 w-5 text-white" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white">Learning Objectives</p>
                      <p className="font-semibold text-white">{apiData.data.statistics.total_learning_objectives}</p>
                    </div>
                    <div>
                      <p className="text-white">Modules</p>
                      <p className="font-semibold text-white">{apiData.data.statistics.total_modules}</p>
                    </div>
                    <div>
                      <p className="text-white">Prerequisites</p>
                      <p className="font-semibold text-white">{apiData.data.statistics.total_prerequisites}</p>
                    </div>
                    <div>
                      <p className="text-white">Avg Difficulty</p>
                      <p className="font-semibold text-white">{apiData.data.statistics.avg_difficulty.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Badge className={apiData.data.statistics.finalized ? 'bg-[#a020f0] text-white' : 'bg-[#3f3f3f] text-white'}>
                      {apiData.data.statistics.finalized ? 'Finalized' : 'Draft'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {apiData && apiData.data.modules && apiData.data.modules.length > 0 && (
              <Card className="bg-[#282828]">
                <CardHeader>
                  <CardTitle className="text-white">Modules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {apiData.data.modules.map((module) => (
                      <div key={module.id} className="p-3 border border-white/20 rounded-lg bg-[#3f3f3f]">
                        <h4 className="font-medium text-sm text-white">{module.title}</h4>
                        <p className="text-xs text-white mt-1">{module.description}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-white">
                            {module.core_los}/{module.total_los} LOs
                          </span>
                          <Badge className={module.finalized ? 'bg-[#a020f0] text-white text-xs' : 'bg-[#181818] text-white text-xs'}>
                            {module.finalized ? 'Final' : 'Draft'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
