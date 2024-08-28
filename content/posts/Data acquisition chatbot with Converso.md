---
title: "Enhancing LLM Tool Usage with Converso"
date:  2024-08-27T15:30:00
draft:  false
tags: ["AI", "Python", "LangChain", "LLM"]
type: "post"
truncated: true
summary: Meet Converso, a LangChain extension that improves LLMs performance on the usage of complex tools
heroImage: /images/posts/Data_acquisition_chatbot_with_Converso/hero.jpg
showTableOfContents: true

---

# Introduction
Since their introduction, [tools](https://python.langchain.com/v0.1/docs/modules/tools/) tools have significantly expanded the capabilities of LLMs. 
The ability to execute arbitrary code, placing the burden on the LLM to determine when to call a tool and the parameters to use, enabled many real-life applications.

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

The email validation is quite basic, but it can be easily extended.


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
To do so, we'll use a simple agent built using LangGraph.

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

It is not lying. It did call the tool:
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

The problem shown above is enough to limit any implementation of tools in real life products. The lack of control over LLM actions poses a significant risk.

One might argue that a smarter prompt or a more advanced model could mitigate this issue, and they would likely be correct.
However this approach is more costly (better models cost more) and still solely relies onto the LLM to understand what to do with little guidance.  
Also, relying on the conversation history still poses a big limit. Most applications limit the length of the history that is carried during the conversation to reduce costs and avoid to exceed the model's context window. And what if the tool requires a lot of data and some of it falls out of the history? Besides, asking the model to extract all of the input data from the entire textual history is just pushing the limit.

There must be a better way.

# Meet Converso

[**Converso**](https://github.com/gianfrancodemarco/converso) is a LangChain extension that introduces *statefulness* to better guide the LLM through the data acquisition process for more complex tools.
Practically, it defines **FormTool**s, which derive from LangChain tools, and the *FormAgentExecutor*, a LangGraph implementation capable of managing standard LangChain tools, FormTools and error correction.

With FormTools, the LLM:
- actively guides the user toward the completion of the action
- persist the data instead of relying only on the history
- ask for confirmation before executing actions

## FormTool and FormAgentExecutor

A *FormTool* is very similar to a LangChain tool.
If no customization is required, the definitions are almost identical:

```python
from typing import Type

from pydantic import BaseModel

from converso import FormTool

class SendEmail(FormTool):
    name = "SendEmail"
    description = """Send an email to a recipient"""
    args_schema: Type[BaseModel] = SendEmailPayload


    def _run_when_complete(
        self,
        *args,
        **kwargs
    ) -> str:
        return "OK"
```

The FormAgentExecutor is where most of the magic happens.
It is a LangGraph graph, which includes error correction and tool calling. It is capable of using both standard tools and FormTools.

When the LLM executes a FormTool, the tool enters into an **active** state (hence the statefulness).
From now on, the conversation flow and the prompts are changed to guide the user into providing all of the needed information to effectively execute the action associated with the prompt.

When a FormTool is active, other FormTools are hidden to reduce errors and costs.
However standard tools can be used even when a FormTool is active; for example, the user can use a tool that searches the internet to provide a required piece of data.

## Let’s test it

The agent is the same defined before.

```
Human: send an email to john to announce that i finished my website
AI: It seems there was an issue with the email recipient address. Could you please provide me with the correct email address for John so that I can send the email successfully?
Human: john@gmail.com
AI: The recipient email address has been updated to john@gmail.com. Could you please provide me with the subject for the email you want to send to John?
Human: i've finished my website!
AI: The subject for the email has been updated. Now, could you please provide me with the body of the email that you would like to send to John to announce that you have finished your website?
Human: generate it for me please

AI: Here is the email content that will be sent to John:
- Recipient: john@gmail.com
- Subject: I've finished my website!
- Body:

Hello John,

I wanted to let you know that I have completed my website. It's been a great journey, and I'm excited to share it with you. Please feel free to visit the website and let me know your thoughts.

Best regards,
[Your Name]

Please confirm if this information is correct and if you would like to send this email to John.

Human: Replace [Your Name] with Gianfranco

AI: The email content has been updated with the name "Gianfranco":
- Recipient: john@gmail.com
- Subject: I've finished my website!
- Body:

Hello John,

I wanted to let you know that I have completed my website. It's been a great journey, and I'm excited to share it with you. Please feel free to visit the website and let me know your thoughts.

Best regards,
Gianfranco

Please confirm if this information is correct and if you would like to send this email to John.
Human: yes
AI: The email has been sent to John with the announcement that you have finished your website. If you need any more assistance or have any other requests, feel free to let me know!

```

## Considerations

This time, the conversation is indeed a lot longer (and costly) - but a lot more correct.

The LLM not only does not hallucinate parameters, but it guides the user through the acquisition of all of the needed data.

Data is stored into an object and doesn't have to be extracted from the conversation history each time. In fact, the history can be a lot shorter and the data won't be forgetten.

Moreover, before executing any action, a confirmation is asked to the user, presenting all of the corrected data. If the LLM (or the user) made a mistake or a wrong assumption, there is room for correction.

# Conclusions

Tools are a great addition to LLMs, since they can be used to perform actions in the real world and break the limits of a text-only conversation.  
However, allowing LLMs to access potentially harmful tools without guidance can be both dangerous and counterproductive.
Converso is a LangChain-based library that allows to define tools and agents that guide the user toward data acquisition, and ask for confirmation before executing any action.
This allows developers to build complex tools while maintaining control over the unpredictability of LLMs.