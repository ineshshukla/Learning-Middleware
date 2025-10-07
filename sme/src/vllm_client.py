"""VLLM HTTP client wrapper for dual-model setup.

Provides client for two separate VLLM instances:
- 4B model on one port for content generation
- 1.7B model on another port for KLI structuring

Configuration via environment variables:
- VLLM_4B_URL (default http://localhost:8001/v1)
- VLLM_1_7B_URL (default http://localhost:8002/v1)
- VLLM_API_KEY (optional, shared or separate)
- VLLM_TIMEOUT (default 300)
- VLLM_RETRIES (default 2)
"""
import os
import time
from typing import Dict, Any, Optional, AsyncIterator

import httpx
import json
from fastapi import HTTPException


from dotenv import load_dotenv
load_dotenv()

# Configuration for 4B model
VLLM_4B_URL = os.getenv('VLLM_4B_URL', 'http://localhost:8001/v1').rstrip('/')
VLLM_4B_MODEL = os.getenv('VLLM_4B_MODEL', './Qwen3-4B-Thinking-2507-Q4_K_M.gguf')

# Configuration for 1.7B model
VLLM_1_7B_URL = os.getenv('VLLM_1_7B_URL', 'http://localhost:8002/v1').rstrip('/')
VLLM_1_7B_MODEL = os.getenv('VLLM_1_7B_MODEL', './Qwen3-1.7B.gguf')

# Shared configuration
VLLM_API_KEY = os.getenv('VLLM_API_KEY')
TIMEOUT = float(os.getenv('VLLM_TIMEOUT', '300'))
RETRIES = int(os.getenv('VLLM_RETRIES', '2'))


def _build_headers(api_key: Optional[str] = None) -> Dict[str, str]:
    """Build request headers with optional API key."""
    headers = {'Content-Type': 'application/json'}
    key = api_key or VLLM_API_KEY
    if key:
        headers['Authorization'] = f'Bearer {key}'
    return headers


def _post(base_url: str, endpoint: str, payload: Dict[str, Any], 
          api_key: Optional[str] = None) -> Dict[str, Any]:
    """Make POST request to VLLM endpoint with retries."""
    url = f"{base_url}/{endpoint}"
    headers = _build_headers(api_key)
    
    for attempt in range(RETRIES + 1):
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                
                data = response.json()
                return {'ok': True, 'data': data}
                
        except httpx.TimeoutException:
            if attempt < RETRIES:
                time.sleep(2 ** attempt)
                continue
            return {'ok': False, 'error': 'Request timeout', 'data': None}
            
        except httpx.HTTPStatusError as e:
            return {'ok': False, 'error': f'HTTP {e.response.status_code}: {e.response.text}', 'data': None}
            
        except Exception as e:
            return {'ok': False, 'error': str(e), 'data': None}
    
    return {'ok': False, 'error': 'Max retries exceeded', 'data': None}


def _extract_text(result: Dict[str, Any]) -> str:
    """Extract text from VLLM API response."""
    if not result.get('ok', False):
        return ''
    
    data = result.get('data', {})
    
    # VLLM uses OpenAI-compatible format
    if 'choices' in data and len(data['choices']) > 0:
        choice = data['choices'][0]
        if 'message' in choice:
            return choice['message'].get('content', '')
        elif 'text' in choice:
            return choice['text']
    
    # Fallback
    return data.get('text', data.get('output', ''))


def infer_4b(prompt: str, max_tokens: int = 1024, temperature: float = 0.7, 
             api_key: Optional[str] = None) -> Dict[str, Any]:
    """Call the 4B model via VLLM.

    Args:
        prompt: Input text prompt
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature
        api_key: Optional API key override

    Returns:
        Dict with {ok: bool, text: str, raw: {...}}
    """
    payload = {
        'model': VLLM_4B_MODEL,
        'messages': [
            {'role': 'user', 'content': prompt}
        ],
        'max_tokens': max_tokens,
        'temperature': temperature,
        'stream': False
    }
    
    res = _post(VLLM_4B_URL, 'chat/completions', payload, api_key)
    text = _extract_text(res)
    
    return {
        'ok': res.get('ok', False), 
        'text': text, 
        'raw': res.get('data'),
        'model': VLLM_4B_MODEL,
        'endpoint': VLLM_4B_URL
    }

async def infer_4b_stream(prompt: str, max_tokens: int = 1024, temperature: float = 0.7,
                          api_key: Optional[str] = None) -> AsyncIterator[str]:
    """Stream responses from the 4B model via VLLM.
    
    Args:
        prompt: Input text prompt
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature
        api_key: Optional API key override
    
    Yields:
        str: Chunks of generated text
    
    Raises:
        httpx.HTTPStatusError: If VLLM returns an error status
    """
    payload = {
        'model': VLLM_4B_MODEL,
        'messages': [
            {'role': 'user', 'content': prompt}
        ],
        'max_tokens': max_tokens,
        'temperature': temperature,
        'stream': True  # Enable streaming
    }
    
    url = f"{VLLM_4B_URL}/chat/completions"
    headers = _build_headers(api_key)
    
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        async with client.stream('POST', url, json=payload, headers=headers) as response:
            # Check for HTTP errors BEFORE starting to yield
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                error_detail = f"VLLM Error {e.response.status_code}: {e.response.text}"
                print(f"❌ VLLM streaming error: {error_detail}")
                raise HTTPException(status_code=502, detail=error_detail)
            
            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    data_str = line[6:]  # Remove 'data: ' prefix
                    
                    if data_str.strip() == '[DONE]':
                        break
                    
                    try:
                        data = json.loads(data_str)
                        if 'choices' in data and len(data['choices']) > 0:
                            delta = data['choices'][0].get('delta', {})
                            content = delta.get('content', '')
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        continue


def infer_1_7b(prompt: str, max_tokens: int = 1024, temperature: float = 0.3,
               api_key: Optional[str] = None) -> Dict[str, Any]:
    """Call the 1.7B KLI model via VLLM.
    
    Args:
        prompt: Input text prompt
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature (lower for consistency)
        api_key: Optional API key override
    
    Returns:
        Dict with {ok: bool, text: str, raw: {...}}
    """
    payload = {
        'model': VLLM_1_7B_MODEL,
        'messages': [
            {'role': 'user', 'content': prompt}
        ],
        'max_tokens': max_tokens,
        'temperature': temperature,
        'stream': False
    }
    
    res = _post(VLLM_1_7B_URL, 'chat/completions', payload, api_key)
    text = _extract_text(res)
    
    return {
        'ok': res.get('ok', False), 
        'text': text, 
        'raw': res.get('data'),
        'model': VLLM_1_7B_MODEL,
        'endpoint': VLLM_1_7B_URL
    }


# Compatibility function for health checks
def check_model_health(model_type: str = '4b') -> Dict[str, Any]:
    """Check if a VLLM model endpoint is healthy."""
    try:
        url = VLLM_4B_URL if model_type == '4b' else VLLM_1_7B_URL
        print(f"🔍 Testing connection to {url}")
        
        if model_type == '4b':
            result = infer_4b("ping", max_tokens=5)
        else:
            result = infer_1_7b("ping", max_tokens=5)
        
        return {
            'healthy': result.get('ok', False),
            'model': result.get('model'),
            'endpoint': result.get('endpoint'),
            'error': None if result.get('ok') else 'Model not responding'
        }
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Connection test failed: {error_msg}")
        return {
            'healthy': False,
            'model': model_type,
            'endpoint': VLLM_4B_URL if model_type == '4b' else VLLM_1_7B_URL,
            'error': error_msg
        }