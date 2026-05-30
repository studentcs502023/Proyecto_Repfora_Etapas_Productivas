import google.generativeai as genai
from google.adk.agents.llm_agent import Agent
import os

api_key_real = "AIzaSyDNPOPG3m1dN6WplJwSXUkKZZ4IjEBBxjU"
genai.configure(api_key=api_key_real)
os.environ["GOOGLE_API_KEY"] = api_key_real

root_agent = Agent(
    model='gemini-1.5-pro',
    name='test',
    instruction='test'
)

print("Atributos y métodos de root_agent:")
print(dir(root_agent))
