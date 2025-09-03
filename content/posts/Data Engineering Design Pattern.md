---
title: "I've read Data Engineering Design Patterns and you should too"
date: 2025-09-02
description: ""
type: "post"
tags: ["Databases", "Data Engineering", "ETL"]
weight: 1
summary: ""
image: /images/posts/Data_Engineering_Design_Patterns/hero.png
showTableOfContents: true
readTime: 10

---

## Introduction
[Data Engineering Design Patterns: Recipes for Solving the Most Common Data Engineering Problems](https://www.oreilly.com/library/view/data-engineering-design/9781098165826/) is a recent book by [Bartosz Konieczny](https://www.oreilly.com/search/?q=author:%22Bartosz%20Konieczny%22), which aims to organize design patterns for data engineering in a way similar to software engineering.

The author suggests two ways to approach the book. If you are just starting, read it from beginning to end to get an overview of the various types of problems and solutions. If you already have experience, you can use it to discover patterns you might not know and also as a [cookbook](https://en.wikipedia.org/wiki/Cookbook).

The book covers the whole data engineering workflow, and this is the list of chapters you will find:
1. **Introducing Data Engineering Design Patterns**
2. **Data Ingestion** Design Patterns
3. **Error Management** Design Patterns
4. **Idempotency** Design Patterns
5. **Data Value** Design Patterns
6. **Data Flow** Design Patterns
7. **Data Security** Design Patterns
8. **Data Storage** Design Patterns
9. **Data Quality** Design Patterns
10. **Data Observability** Design Patterns


---

## The Good
- **Organized and direct**: Each chapter follows the same structure. Each pattern is presented with a **problem**, a **solution**, **consequences** and **examples**.  
This helps both when first reading the book and when using it as a reference.  
Being a Software Engineer, I found that having a clear, top-down structure is very helpful for learning. Others with a similar learning style will likely appreciate this.
- **Covers the full workflow**: The book covers the full data engineering workflow, from ingestion to transformation, storing, and querying, including chapters on security and observability. 
Most patterns or common problems are likely addressed.  

- **Relatively quick to read**: The structured and pragmatic approach makes it a relatively quick read.
- **Contextualized examples**: Each pattern includes an example problem, providing context and aiding understanding.

---

## The Bad
- **Not for complete beginners**: The book assumes some foundational knowledge of databases and data engineering concepts. Readers new to the field may benefit from first reading books like [Designing Data-Intensive Applications](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) by [Martin Kleppmann](https://www.oreilly.com/search/?query=author:%22Martin%20Kleppmann%22&sort=relevance&highlight=true). Some concepts, such as vertical and horizontal partitioning, may be challenging without a basic understanding of distributed systems.  

- **Code examples could be improved**: The code examples are somewhat **generic** and could easily be found online.
Having them is better than nothing, but I think that using that space to provide more conceptual or context-rich examples might help readers develop a deeper understanding of the patterns.

---

## Conclusions
*Data Engineering Design Patterns* is a valuable resource for anyone working in data engineering, as well as for software engineers who handle data. It is relatively quick to read, and its organization allows readers to focus on what interests them. It also helps gather ideas for concepts that appear often but may lack standard names, providing a shared terminology to communicate effectively with other data engineers.  

If you're just starting or only have practical experience, probably you should focus on more foundational books, which are more likely to be more relevant to your needs.  
If you're already familiar with the concepts and are looking for a more practical book, this one is a must-read, and I'm sure that will pass the test of time.