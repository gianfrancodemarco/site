---
title: "DumbDB III: from text to results - an high-level overview"
date: 2025-04-17
description: ""
type: "post"
tags: ["Python", "Databases", "Data Engineering"]
weight: 1
summary: "An high-level overview of how a textual SQL query is processed by a DBMS to produce a result"
image: /images/posts/dumb-db-3/hero.jpg
showTableOfContents: true
---
{{< dumbdb-series >}}

# Introduction

In the first two posts of the series we have discussed how to implement a very simple storage strategy for a database.  
We also implemented an API to execute simple queries on the database.  
However, developers don't usually interact with their database using its low-level API, but rather communicate with it using a high-level language like SQL.

Going from textual SQL queries to the final result is a complex process, that involves multiple components working together.
In this post we will see an high-level overview of the process of how a textual SQL query is processed by a DBMS to produce a result, and how we can implement it in DumbDB.  

# DumbDB's SQL

SQL is a vast language, with a long history and many different dialects.  
Of course, to adapt to the tone of this series, we will implement a simplified version of SQL.  
What we want to achieve is the possibility to execute the following types of queries:
- **create/use/drop database**
- **create/use/drop table**
- **insert/update/delete**
- **select**  

At this point, we will account for simple where clauses, but ignore more complex operations like joins and subqueries.  
We will need an entrypoint that allows the user to write the query in a human-readable way and receive the result as output.  
In the future, this could happen over the network, but for now we will keep it simple and create a **REPL** (Read-Eval-Print Loop) that allows the user to interact with the DBMS using the CLI.

# From text to results

To execute a query, DMBSs need to go from the textual representation of the query to an internal representation that can be executed.  
Multiple steps are involved in this process, usually called **query execution flow**:
- **Lexical tokenization**
- **Parsing**
- **Optimization**
- **Execution**

## Lexical tokenization

**Lexical tokenization** is the process of splitting a string into *meaningful* units called **tokens**, which can be words, characters, punctuation, etc.  
Each token is assigned a specific meaning, on which the language's grammar is based.

For example, the sentence "The answer to the universe is 42." could be tokenized into the following tokens:

```
[("The", "word"), ("answer", "word"), ("to", "word"), ("the", "word"), ("universe", "word"), ("is", "word"), ("42", "number"), (".", "punctuation")]
```

A simple way to implement a **tokenizer** is using a rule-based approach, where a set of rules are applied to the input string to produce the tokens. These rules can be in the form of regular expressions.
A set of rules for DumbDB's SQL could be the following:

```python
(TokenType.CREATE,     r'CREATE\b'),
(TokenType.DROP,       r'DROP\b'),
(TokenType.USE,        r'USE\b'),
(TokenType.SHOW,       r'SHOW\b'),
(TokenType.DATABASES,  r'DATABASES\b'),
(TokenType.TABLES,     r'TABLES\b'),
(TokenType.DATABASE,   r'DATABASE\b'),
(TokenType.TABLE,      r'TABLE\b'),
(TokenType.SELECT,     r'SELECT\b'),
(TokenType.FROM,       r'FROM\b'),
(TokenType.INSERT,     r'INSERT\b'),
(TokenType.INTO,       r'INTO\b'),
(TokenType.VALUES,     r'VALUES\b'),
(TokenType.DELETE,     r'DELETE\b'),
(TokenType.UPDATE,     r'UPDATE\b'),
(TokenType.SET,        r'SET\b'),
(TokenType.WHERE,      r'WHERE\b'),
(TokenType.AND,        r'AND\b'),
(TokenType.EQUALS,     r'='),
(TokenType.STAR,       r'\*'),
(TokenType.COMMA,      r','),
(TokenType.LPAREN,     r'\('),
(TokenType.RPAREN,     r'\)'),
(TokenType.SEMICOLON,  r';'),
(TokenType.IDENTIFIER, r'[A-Za-z_][A-Za-z0-9_]*'),
(TokenType.LITERAL,    r'\'[^\']*\'|"[^\"]*"|-?\d+(\.\d+)?'),
(TokenType.WS,         r'\s+'),
```

These rules allow the tokenizer to recognize most common SQL keywords, some operators, whitespace, and identifiers.

| Component | Input | Output |
|-----------|-------|--------|
| Lexical Tokenizer | Textual SQL query | List of tokens |

## Parsing

Once we have the list of tokens, we apply **Parsing** or **Syntax Analysis** to convert it to an appropriate internal representation.  

A **grammar** is a set of rules that describe the syntax of a language.  
The **parser** tries to apply the grammar rules to the list of tokens to produce a **parse tree**.  
If the input string does not match the grammar rules, the parser will raise an error.  
If it does, then an internal representation of the query is successfully produced.

DumbDB's parser will produce an **Abstract Syntax Tree** (AST), which is a tree representation of the query.  
Each node in the tree represents a specific operation, and the tree's structure reflects the sequence of operations in the query.
It is *abstract* in the sense that it does not represent explicitly every single detail of the query, but rather a simplified version - for example, parentheses are omitted and reflected in the tree's structure.

So, to produce a parser we will need to define:
- a **grammar** for DumbDB's SQL
- an **AST** definition for DumbDB's SQL
- a **parser** that applies the grammar rules to the list of tokens to produce the AST

| Component | Input | Output |
|-----------|-------|--------|
| Parser | List of tokens | Abstract Syntax Tree |


## Optimization

We can look at the AST as a **logical plan** for the query. The **planner** will look at the AST and will produce a **physical plan** - a detailed plan of the operations to be executed.    

The **planner** will explore the possible **physical query plans** - and attach to each operation of each plan an **estimated cost**.  
The planner will choose the plan with the lowest cost, and the physical plan will be used to execute the query.  
The choices that the planner makes are things like: the order of the operations, the way to access the data (sequential scan, index scan, etc.), which join techniques to use, etc.  

Optimizations are usually based on **relational algebra** and an example is **selection pushdown**. Imagine the following query:

```sql
SELECT * FROM users 
INNER JOIN orders ON users.id = orders.user_id
WHERE age > 30;
```

Reading the query as it is, a possible plan could be:
1. Read all users
2. Read all orders
3. Join the users and orders
4. Filter the results with the WHERE clause

However, we can push the filter down to the join operation, so that the join is executed on a smaller set of data:
1. Read all users
2. Filter users with the WHERE clause
3. Read all orders
4. Join the filtered users and orders

This simple optimization will reduce the number of operations and the amount of data that needs to be processed and stored.

As usually happens, optimization involves a trade-off between the time spent of exploring possible plans and the time spent on the actual execution of the query.    

To respect the tradition of this project, we will not implement any optimization and directly execute the query from the AST.

| Component | Input | Output |
|-----------|-------|--------|
| Planner (Not implemented in DumbDB) | Abstract Syntax Tree | Physical Plan |

## Execution

The **execution engine** will take the physical plan and will execute the query.  
For DumbDB, also this phase is really dumbed down.  
The **engine** simply acts as a dispatcher, calling the correct function of a [DBMS object](/posts/dumb-db-1#a-database-management-system-interface) that will execute the query.

The AST has an entry level node which represent the specific query operation to be executed.  
For example, a `SELECT` operation will be represented by the `SelectQuery` class.
When the engine receives a `SelectQuery` object, it will call the `query` function of the DBMS object; if it receives a `CreateTableQuery` object, it will call the `create_table` function, and so on.

| Component | Input | Output |
|-----------|-------|--------|
| Execution Engine | Physical Plan | Result |

# Wrapping up

Even if the DumbDB's execution engine is really simple, it is enough to execute the queries we have implemented so far.  
![DumbDB query execution](/images/posts/dumb-db-3/query-execution-flow.svg)

<img src="/images/posts/dumb-db-3/query-execution-flow.svg" alt="DumbDB query execution" width="50%" />

In the next posts we will dive into the details of each component.


# References
- [Read–eval–print loop](https://en.wikipedia.org/wiki/Read–eval–print_loop)
- [Lexical analysis](https://en.wikipedia.org/wiki/Lexical_analysis)
- [Parser](https://marketguard.io/glossary/parser#:~:text=A%20parser%20is%20a%20software,the%20case%20of%20programming%20languages)
- [Abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree#:~:text=This%20distinguishes%20abstract%20syntax%20trees,AST%20by%20means%20of%20subsequent)
- [Physical plan](https://howqueryengineswork.com/07-physical-plan.html)
- [Query optimization](https://en.wikipedia.org/wiki/Query_optimization)
- [Relational algebra](https://db.in.tum.de/~grust/teaching/ss06/DBfA/db1-03.pdf)
- [Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems 1st Edition](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) by Martin Kleppmann
- [DumbDB source code](https://github.com/gianfrancodemarco/dumbdb/tree/2.0.0-append-only-database-hash-index)