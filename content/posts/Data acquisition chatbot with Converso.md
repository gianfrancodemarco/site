---
title: "Data acquisition chatbot with Converso"
date:  2024-08-27T15:30:00
draft:  false
tags: ["AI", "Python", "LangChain", "LLM"]
type: "post"
truncated: true
summary: Explore how to build a Telegram Bot for Plate Recognition, with a complete CI/CD pipeline and monitoring dashboards. 
heroImage: /images/posts/Data_acquisition_chatbot_with_Converso/hero.jpg
showTableOfContents: true

---

# Introduction
Since their inception, tools have tremendously expanded the range of things that LLMs can do. The ability to execute arbitrary code during a textual conversation,
leaving to the LLM the burden of understanding when to call a tool and the parameters to use, enabled their usage in many real-life use cases.

However, stateless conversations coerce LLMs to only rely on conversation history to manage tool calls.
This makes it difficult to implement complex tools, with more than a couple of parameters and some decisional logic.
Moverover, the little control over the LLM's actions is a bit scary when implementing tools with real-world side-effect, such as sending an e-mail or placing an order.

**Converso** is a Langchain extension that tries to overcome this limitation by making the conversation *stateful* and guiding the LLM.

# A running example

Let's say that we want to implement a simple tool to allow users to send emails through the LLM.  
The tool input is described by this Pydantic model:

```python
from pydantic import BaseModel, Field, field_validator

class SendEmailPayload(BaseModel):

    recipient: str = Field(
        description="Recipient email"
    )
    
    subject: str = Field(
        description="Email subject"
    )
    
    body: str = Field(
        description="Email body"
    )
    
    @field_validator("recipient")
    def validate_recipient(cls, v):
        if not v:
            raise ValueError("Email must be set")
        if "@" not in v:
            raise ValueError("Invalid email")
        return v
```

The email validation is very naive, but can be easily extended.


# The old way

Implementing the tool with LangChain is pretty straightforward:

```python
from typing import Type

from pydantic import BaseModel

from langchain_core.tools import BaseTool

class SendEmail(BaseTool):
    name = "SendEmail"
    description = """Send an email to a recipient"""
    args_schema: Type[BaseModel] = SendEmailPayload


    def _run(
        self,
        *args,
        **kwargs
    ) -> str:
        print(f"Tool called with args: {args}, kwargs: {kwargs}")
        return "Email sent" # Short circuit the actual sending
```

Now let's put it to a test.   
To do so, we'll use a simple agent build using LangGraph:

{{<details "Agent implementation">}}


```python
import os

from langchain.schema import AIMessage, HumanMessage, SystemMessage

from converso import FormAgentExecutor

os.environ["OPENAI_API_KEY"] = "sk-proj-xxx"

graph = FormAgentExecutor(
    tools=[
        SendEmail()
    ]
)

history = []
active_form_tool = None

while True:
    human_input = input("Human: ")
    if not human_input:
        break

    inputs = {
        "input": human_input,
        "chat_history": history,
        "intermediate_steps": [],
        "active_form_tool": active_form_tool
    }

    for output in graph.app.stream(inputs, config={"recursion_limit": 25}):
        for key, value in output.items():
            pass

    active_form_tool = value.get("active_form_tool")

    print(output)
    output = graph.parse_output(output)
    print(f"Human: {human_input}")
    print(f"AI: {output}")

    history = [
        *history,
        HumanMessage(content=human_input),
        AIMessage(content=output)
    ]
```

{{< /details >}}

## Let's test it

This is how the conversation goes:

```
Human: send an email to john to announce that i finished my website
AI: I have sent an email to John to announce that you have finished your website.
```

It is not lying. It actually has called the tool:
```
Tool called with args: (), kwargs: 
{
   "recipient":"john@example.com",
   "subject":"Completion of Website",
   "body":"Hi John,\n\nI am excited to announce that I have finished my website! It's been a great journey, and I can't wait for you to see the final product. Please let me know if you have any feedback or suggestions.\n\nBest regards,\n[Your Name]"
}
```

You obviously can see the problem here.
Not only it didn't ask for the body of the email or the subject, but he sent the email to a **random recipient**!

## Considerations

The problem shown above is enough to limit any implementation of tools in real life products. Having so little control over the actions of the LLM is a serious risk.

One could argue that a smarter prompt or a more advanced model could reduce this issue, and he'd probably right.  
However this approach is more costly (better models cost more) and still solely relies onto the LLM to understand what to do without any guidance.  
Also, relying on the conversation history still poses a big limit. Most applications limit the length of the history that is carried during the conversation to reduce costs and avoid to exceed the model's context window. And what if the tool requires a lot of data and some of it falls out of the history? Besides, asking the model to extract all of the input data from the entire textual history is just pushing the limit.

There must be a better way.

# Meet Converso