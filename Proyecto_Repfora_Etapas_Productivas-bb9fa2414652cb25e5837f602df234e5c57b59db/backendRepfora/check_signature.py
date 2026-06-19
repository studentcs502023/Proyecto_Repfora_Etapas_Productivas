from google.adk.agents.llm_agent import Agent
import inspect

root_agent = Agent(
    model='gemini-1.5-pro',
    name='test',
    instruction='test'
)

print("Signature of run_live:")
print(inspect.signature(root_agent.run_live))
