import vllm_client
result = vllm_client.infer_4b("hello")
print(result["text"])