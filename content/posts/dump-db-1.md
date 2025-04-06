---
title: "DumbDB: Implementing a dumb database from scratch - Part I: an Append Only Database"
date: 2025-04-06
description: ""
type: "post"
tags: ["Python", "Databases", "Data Engineering"]
weight: 1
summary: "Developing a dumb database from scratch using Python - implement the most common operations on with an Append Only Database"
showTableOfContents: true
---

Having a fundamental understanding of how databases work is crucial for developers - that's true even if you work as a frontend developer and you won't ever touch a database directly.

Databases are fundamentally an **abstraction of a file system**, that hides from the developer the complexity of the underlying storage, and takes care of a huge amount of details - concurrency, data integrity, availability, optimization, etc., which we usually take for granted.

As I periodically find myself refreshing my knowledge on the subject, and I'm a huge fan of learning by doing, I had the idea of trying to implement a simple database from scratch.
As per the title of the project (DumbDB), the aim is not to create a database useful for anything, but rather explore at a deeper level some concepts such as:
- **basic database strategies**
- **basic database APIs**
- **indexes**
- **query parser** (if I'm able to be consistent up to this point :D)
- ...

The implementation will be done in Python and the source code will be available on [GitHub](https://github.com/gianfrancodemarco/dumbdb).

# A Database interface

We well define a basic interface for our database - the minimal set of operations that we expect it to support.
We do this using an abstract class:

```python
@dataclass
class Database(ABC):
    name: str
    root_dir: Path = Path("./data")

    @abstractmethod
    def create_database(name: str) -> None:
        raise NotImplementedError()

    @abstractmethod
    def create_table(name: str) -> None:
        raise NotImplementedError()

    @abstractmethod
    def drop_table(name: str) -> None:
        raise NotImplementedError()

    @abstractmethod
    def insert(table: str, value: dict) -> None:
        raise NotImplementedError()

    @abstractmethod
    def update(table: str, value: dict) -> None:
        raise NotImplementedError()

    @abstractmethod
    def delete(table: str, value: dict) -> None:
        raise NotImplementedError()

    @abstractmethod
    def query(table: str, query: dict) -> QueryResult:
        raise NotImplementedError()
```

Basically, we want to be able to:
- create a database
- create tables into the database
- insert data (rows) into a table
- update data
- delete data
- query data from a table, based on some criteria

As previously said, a database is basically an abstraction of a file system, so we'll need to define the structure of the database files.
For this project, the approach will be to have:
- a folder for each database
- inside the database, a folder for tables (in the future, we could have a folder for indexes and other things as well)
- inside the tables folder, a file for the table data

The choice of how to structure the data for the table is a fundamental one, and it will have a big impact on the performance of the database. Our first implementation will be an **append only database**.

# An Append Only Database

An **append only database** is a database that only allows to append data to the end of the file. This makes the database much simpler to implement, and makes inserts extremely fast.

On the other hand, to find a specific row, we need to read the entire file, which makes the queries much slower.

Let's see how we can implement the operations of the interface described above.

## Create Database

Creating a database is straightforward: we just need to create a folder for the database, and inside of it a folder for the tables.

```python
@dataclass
class AppendOnlyDatabase(Database):
    """
    A class representing an append-only database.
    This database does not store data in memory, but rather on disk.
    It only appends data to the end of the file. For each primary key, the last record is the valid one.
    """

    @property
    def tables_dir(self) -> Path:
        return self.root_dir / f"{self.name}/tables"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.create_database()

    def create_database(self) -> None:
        if not self.tables_dir.exists():
            self.tables_dir.mkdir(parents=True)

```

## Create Table

Creating a table means creating a file for the table data.
One of the simplest way to store data is to use a CSV file.
At this point, we only need to store the header of the CSV - which is the column names for the table.
We enforce that each table has a primary key column named `id` (the reason will be clear later).

```python
    def get_table_file_path(self, table_name: str) -> Path:
        return self.tables_dir / f"{table_name}.csv"

    def create_table(self, table_name: str, headers: list[str] = None) -> None:
        """Create a new table in the database - which is just a new csv file."""
        table_file = self.get_table_file_path(table_name)

        if table_file.exists():
            raise ValueError(f"Table '{table_name}' already exists")

        if not headers:
            headers = ["id"]

        headers.append("__deleted__")
```

At this point, we are able to run the following code:

```python
import dumbdb

db = dumbdb.AppendOnlyDatabase("my_first_db")
db.create_table("my_first_table", ["id", "name", "age"])
```

And the situation on disk should be:

```
>> tree data
data
└── my_first_db
    └── tables
        └── my_first_table.csv

>> cat data/my_first_db/tables/my_first_table.csv
id,name,age,__deleted__
```

Hurray! We have successfully initialized a database and a table!

## Drop Table

Being a table just a file on disk, the drop operation is straightforward: we just need to delete the file.

```python
    def drop_table(self, table_name: str) -> None:
        table_file = self.get_table_file_path(table_name)
        if not table_file.exists():
            raise ValueError(f"Table '{table_name}' does not exist")

        table_file.unlink()
```

## Insert Data
 
Right now, our database is pretty much useless.
To make anything useful, we need at least to be able to store data.
Being the file an append only CSV, inserting a row means just opening the file in `append` mode and writing the row to the end of the file. 

*We must be careful to set the `__deleted__` column to `False` for all of the rows.*

```python
    def insert(self, table_name: str, value: dict):
        table_file = self.get_table_file_path(table_name)
        if not table_file.exists():
            raise ValueError(f"Table '{table_name}' does not exist")

        with open(table_file, 'a', newline='') as f:
            csv_writer = csv.writer(f)
            csv_writer.writerow(list(value.values()) + [False])
```

> **Note:** At this point, we are not checking that the inserted data respects the table schema, so we just trust the user.

Also, being the file append only, we cannot update or delete data directly, so we need another strategy to implement updates and deletes.

## Update Data

Any respectable database (even if DumbDB is not one of them!) should be able to update data.
The constraint of having an append only file means that we cannot directly update a previously inserted row, but we have to think of another strategy.

In reality, the strategy is pretty simple: we just insert a new row with the updated data, and when we query we only consider the most recent data.
So, updating data is just a wrapper around the insert operation.

However, for this to work, we need to be able to understand when two CSV rows are referring to the same row.
To do this, we'll use the primary key column that we enforced to be present in each table.

> **Note:** Before inserting, we add a check to make sure that the row that we want to update exists.

```python
    def update(self, table_name: str, value: dict) -> None:
        table_file = self.get_table_file_path(table_name)
        if not table_file.exists():
            raise ValueError(f"Table '{table_name}' does not exist")

        query_result = self.query(table_name, {"id": value["id"]})
        if not query_result.rows:
            raise ValueError(f"Row with id {value['id']} does not exist")

        self.insert(table_name, value)
```

## Delete Data

As for the update operation, being the file append only, we cannot directly delete a row.
That's why we have been preparing the way for this operation by adding the `__deleted__` column.

When we want to delete a row, we can just insert a new row with the same id, but with the `__deleted__` column set to `True`.  
When we query the data, if we found a row with the `__deleted__` column set to `True`, we need to ignore **all previous rows** with the same id.

>*Note:* The *delete* operation is identical to the *insert* operation, except for the `__deleted__` column value - so it could be better engineered.

```python
    def delete(self, table_name: str, value: dict) -> None:
        table_file = self.get_table_file_path(table_name)
        if not table_file.exists():
            raise ValueError(f"Table '{table_name}' does not exist")

        with open(table_file, 'a', newline='') as f:
            csv_writer = csv.writer(f)
            csv_writer.writerow(list(value.values()) + [True])
```

## Query Data

We're almost there. We are now able to insert, update and delete data. However this is pretty much useless if we cannot query it.
The query operation is probably the most complex one, since it needs to be able to handle the *update* and *delete* operations as we have defined them.

Basically, our **simplified query operation** will take a dict of column names and values, and will return a list of rows that match the query. Only the equality operator is supported at this point.

The query operation will need to:
- find all of the rows that match the query
- for each row, keep only the latest row
- if a row is marked as deleted, ignore all previous rows with the same id

The strategy implemented is pretty simple: we create a dictionary of the rows that we have found, using the `id` as the key.
When we find an updated version of the row, we just overwrite the previous value in the dictionary.
We do the same for the deleted rows. 
After that, we exclude from the result all of the rows that are marked as deleted.

```python
def query(self, table_name: str, query: dict) -> QueryResult:
    start_time = time.time()
    table_file = self.get_table_file_path(table_name)
    if not table_file.exists():
        raise ValueError(f"Table '{table_name}' does not exist")

    matching_rows = {}
    with open(table_file, 'r', newline='') as f:
        csv_reader = csv.DictReader(f)
        for row in csv_reader:
            if all(row[key] == query[key] for key in query):
                matching_rows[row['id']] = row

    # Remove all rows for which the last line is a delete
    matching_rows = {k: v for k,
                        v in matching_rows.items() if v['__deleted__'] == 'False'}

    return QueryResult(time.time() - start_time, list(matching_rows.values()))
```

# Let's test it!

At this point, we have a fully functional database - at least, for those that were our initial requirements.
We can run a few tests and see if it works as expected.

Let's add some data:

```python
import dumbdb

db = dumbdb.AppendOnlyDatabase("my_first_db")
db.create_table("users", ["id", "name", "age"])

db.insert("users", {"id": "1", "name": "John", "age": "30"})
db.insert("users", {"id": "2", "name": "Jane", "age": "25"})
db.insert("users", {"id": "3", "name": "Luke", "age": "25"})
```

Now, let's query the data:

```python
print(db.query("users", {"id": "2"}))

>>> QueryResult(time=0.0006139278411865234, rows=[{'id': '2', 'name': 'Jane', 'age': '25', '__deleted__': 'False'}])

print(db.query("users", {"age": "25"}))

>>> QueryResult(
    time=0.0006849765777587891, 
    rows=[
        {'id': '2', 'name': 'Jane', 'age': '25', '__deleted__': 'False'}, 
        {'id': '3', 'name': 'Luke', 'age': '25', '__deleted__': 'False'}
    ]
)
```

Oh, we forgot that today is Jane's birthday! Let's update her age:

```python
db.update("users", {"id": "2", "name": "Jane", "age": "26"})
print(db.query("users", {"id": "2",}))

>>> QueryResult(time=0.0006139278411865234, rows=[{'id': '2', 'name': 'Jane', 'age': '26', '__deleted__': 'False'}])
```

Now that we are done with it, let's drop our table and call it a day!

```python
db.drop_table("users")
print(db.query("users", {"id": "2"}))

>>> ValueError: Table 'users' does not exist
```

## Performance considerations

Now let's test the performance of our database in various situations.
Let's try to insert a few rows, first in an empty database, and then in a database already full of data.

```python
-------------------------------- live log call ---------------------------------
15:34:32 INFO Current number of rows in the db: 0
15:34:32 INFO Time taken to insert 1000 rows: 0.0286 seconds
15:34:32 INFO Current number of rows in the db: 1000
15:34:32 INFO Time taken to insert 1000 rows: 0.0282 seconds
15:34:32 INFO Current number of rows in the db: 2000
15:34:32 INFO Time taken to insert 1000 rows: 0.0282 seconds
15:34:32 INFO Current number of rows in the db: 3000
15:34:32 INFO Time taken to insert 1000 rows: 0.0268 seconds
15:34:32 INFO Current number of rows in the db: 4000
15:34:32 INFO Time taken to insert 1000 rows: 0.0272 seconds
15:34:32 INFO Current number of rows in the db: 5000
15:34:32 INFO Time taken to insert 1000 rows: 0.0275 seconds
15:34:32 INFO Current number of rows in the db: 6000
15:34:32 INFO Time taken to insert 1000 rows: 0.0272 seconds
15:34:32 INFO Current number of rows in the db: 7000
15:34:32 INFO Time taken to insert 1000 rows: 0.0279 seconds
15:34:32 INFO Current number of rows in the db: 8000
15:34:32 INFO Time taken to insert 1000 rows: 0.0293 seconds
15:34:32 INFO Current number of rows in the db: 9000
15:34:32 INFO Time taken to insert 1000 rows: 0.0294 seconds
```

As expected, the insert operation performance is not affected by the number of rows in the database.

Now, let's try to query the data at different sizes of the database:

```python
-------------------------------- live log call ---------------------------------
15:37:37 INFO Current number of rows in the db: 1000
15:37:37 INFO Time taken to query 1 row: 0.0008 seconds
15:37:37 INFO Current number of rows in the db: 2000
15:37:37 INFO Time taken to query 1 row: 0.0015 seconds
15:37:37 INFO Current number of rows in the db: 3000
15:37:37 INFO Time taken to query 1 row: 0.0022 seconds
15:37:37 INFO Current number of rows in the db: 4000
15:37:37 INFO Time taken to query 1 row: 0.0029 seconds
15:37:37 INFO Current number of rows in the db: 5000
15:37:37 INFO Time taken to query 1 row: 0.0036 seconds
15:37:37 INFO Current number of rows in the db: 6000
15:37:37 INFO Time taken to query 1 row: 0.0044 seconds
15:37:37 INFO Current number of rows in the db: 7000
15:37:37 INFO Time taken to query 1 row: 0.0050 seconds
15:37:37 INFO Current number of rows in the db: 8000
15:37:37 INFO Time taken to query 1 row: 0.0057 seconds
15:37:37 INFO Current number of rows in the db: 9000
15:37:37 INFO Time taken to query 1 row: 0.0064 seconds
15:37:37 INFO Current number of rows in the db: 10000
15:37:37 INFO Time taken to query 1 row: 0.0071 seconds
```

Again, as expected, the query operation performance is affected by the number of rows in the database. It scales linearly with the number of rows.

# Compaction

For how we have handled the file until now, we can easily see that the file will grow indefinitely.
This will both make it take a lot of space on disk unnecessarily, and even worse will make the query operation slower and slower as the file grows.

To avoid this, we need to implement a **compaction** operation.

The compaction operation will read the file, and for each id it will keep only the latest row.
It will also remove all of the rows that are marked as deleted.
The compacted file will contain only the current state of the table.

```python
    def compact_table(self, table_name: str):
        """Compact a table."""
        table_file = self.get_table_file_path(table_name)
        if not table_file.exists():
            raise ValueError(f"Table '{table_name}' does not exist")

        compacted_data = {}
        with open(table_file, 'r', newline='') as f:
            csv_reader = csv.DictReader(f)
            for row in csv_reader:
                compacted_data[row['id']] = row

        # Remove all rows for which the last line is a delete
        compacted_data = {k: v for k,
                          v in compacted_data.items() if v['__deleted__'] == 'False'}

        with open(table_file, 'w', newline='') as f:
            csv_writer = csv.writer(f)
            # Write headers from the first row's keys
            csv_writer.writerow(list(compacted_data.values())[0].keys())
            for row in compacted_data.values():
                csv_writer.writerow(row.values())
```

Let's check if it works:

```python
import dumbdb

db = dumbdb.AppendOnlyDatabase(name="compact_test")
db.create_table("users", ["id", "name", "age"])

db.insert("users", {"id": "1", "name": "John Smith", "age": "20"})
db.insert("users", {"id": "2", "name": "Mike Smith", "age": "21"})
db.insert("users", {"id": "3", "name": "Luke Skywalker", "age": "26"})

db.update("users", {"id": "1", "name": "John Smith", "age": "21"})
db.delete("users", {"id": "2", "name": "Mike Smith", "age": "21"})
```

File content:

```
>> cat data/compact_test/tables/users.csv
id,name,age,__deleted__
1,John Smith,20,False
2,Mike Smith,21,False
3,Luke Skywalker,26,False
1,John Smith,21,False
2,Mike Smith,21,True
```

Let's compact the table:

```python
db.compact_table("users")
```

File content after compaction:

```
>> cat data/compact_test/tables/users.csv
id,name,age,__deleted__
1,John Smith,21,False
3,Luke Skywalker,26,False
```

As we can see, the row with id `2` has been removed, and for the row with id `1` only the latest version has been kept.

## Considerations

When to run the compaction operation is a design choice, that for real databases would involve a lot of trade-offs.
Would the db halt operations to run the compaction? Would it run the compaction in the background?
Fortunately, for our DumbDB we can just ignore this and run the compaction operation when we want.

# References

- [Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems 1st Edition](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) by Martin Kleppmann
- [DumbDB source code](https://github.com/gianfrancodemarco/dumbdb)