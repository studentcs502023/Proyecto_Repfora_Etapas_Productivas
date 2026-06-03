from google.adk.agents.llm_agent import Agent
import os
import google.generativeai as genai

api_key_real = "AIzaSyDNPOPG3m1dN6WplJwSXUkKZZ4IjEBBxjU"
genai.configure(api_key=api_key_real)
os.environ["GOOGLE_API_KEY"] = api_key_real

root_agent = Agent(
    model='gemini-1.5-pro',
    name='test',
    instruction='Di hola'
)

methods_to_try = ['run', 'chat', 'ask', 'query', 'call', '__call__']

for method in methods_to_try:
    if hasattr(root_agent, method):
        print(f"Encontrado método: {method}")
    else:
        print(f"No se encontró: {method}")

# Intentar llamar sin nombre de método (si es callable)
print(f"¿Es callable?: {callable(root_agent)}")
