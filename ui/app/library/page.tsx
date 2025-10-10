import { Header } from "@/components/header"
import { AIAssistant } from "@/components/ai-assistant"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, FileText, Download, Eye, Trash2 } from "lucide-react"

const libraryFiles = [
  {
    id: 1,
    name: "Introduction to Physics",
    type: "PDF",
    size: "2.4 MB",
    date: "2024-01-15",
    description: "Comprehensive physics fundamentals covering mechanics, thermodynamics, and waves",
  },
  {
    id: 2,
    name: "Chemistry Basics",
    type: "DOCX",
    size: "1.8 MB",
    date: "2024-01-12",
    description: "Essential chemistry concepts including atomic structure and chemical bonding",
  },
  {
    id: 3,
    name: "Mathematics Fundamentals",
    type: "PDF",
    size: "3.2 MB",
    date: "2024-01-10",
    description: "Core mathematical concepts from algebra through calculus",
  },
  {
    id: 4,
    name: "Biology Overview",
    type: "TXT",
    size: "0.9 MB",
    date: "2024-01-08",
    description: "Introduction to cellular biology and basic life processes",
  },
  {
    id: 5,
    name: "Data Science Primer",
    type: "PDF",
    size: "4.1 MB",
    date: "2024-01-05",
    description: "Statistical analysis and machine learning fundamentals",
  },
  {
    id: 6,
    name: "Programming Concepts",
    type: "DOCX",
    size: "2.7 MB",
    date: "2024-01-03",
    description: "Object-oriented programming principles and design patterns",
  },
]

export default function LibraryPage() {
  return (
    <>
      <Header />
      {/* <AIAssistant /> */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">My Library</h1>
            <p className="text-xl text-slate-600">Manage your educational resources and documents</p>
          </div>

          {/* Search Bar */}
          <Card className="mb-8 border-0 glass-effect">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input placeholder="Search your library..." className="pl-12 h-12 text-base" />
              </div>
            </CardContent>
          </Card>

          {/* Files Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {libraryFiles.map((file) => (
              <Card key={file.id} className="group hover:shadow-xl transition-all duration-300 border-0 glass-effect">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {file.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{file.type}</span>
                          <span>•</span>
                          <span>{file.size}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-slate-600 line-clamp-2 mt-2">{file.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-sm text-slate-500">Uploaded on {new Date(file.date).toLocaleDateString()}</div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:text-red-700 bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
