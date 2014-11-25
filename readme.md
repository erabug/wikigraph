wikiGraph
===========
What connects two topics on Wikipedia? For example how many links do you have to click to get from Harry Potter to the Spanish Inquisition?* Combining trivia nerdery with graph theory, wikiGraph allows users to find and explore the paths within Wikipedia.

You can check out the project in progress [here](http://ec2-54-148-235-143.us-west-2.compute.amazonaws.com/).

*It takes 3 clicks: Harry Potter -> British literature -> the spread of the printing press -> the Spanish Inquisition

###Contents
- [Features](#features)
- [The graphs](#the-graphs)
- [Queries](#queries)
- [Data visualization](#data-visualization)
- [User input](#user-input)
- [Improving response time](#improving-response-time)
- [Deployment](#deployment)

#### Features
*Current*
- [x] Wikipedia page links imported into a graph database (Neo4j)
- [x] Python wrapper queries database for shortest path between two nodes, outputs path and secondary relationships as JSON (py2neo)
- [x] Subgraph rendered as a force-directed graph (d3.js)
- [x] Flask app renders html and handles AJAX requests to the database
- [x] Flask app and database deployed (EC2, Apache)
- [x] Search suggest for page titles (typeahead.js, SQLite)
- [x] Embed page images on nodes within the rendered graph (Wikipedia API)
- [x] Option to generate a random search query

*Future*
- [ ] Nodes are sized/colored based on the number of links to other nodes
- [ ] Incorporate summary of path pages as mouseover tooltips (Wikipedia API)
- [ ] Path responses cached (CouchDB)

#### The graphs
I downloaded RDF files (.ttl) for page links and redirects from [DBPedia](http://wiki.dbpedia.org/Downloads2014). Here's what the raw page links file looks like:
```
<http://dbpedia.org/resource/Anarchism> <http://dbpedia.org/ontology/wikiPageWikiLink> <http://dbpedia.org/resource/William_McKinley> .
<http://dbpedia.org/resource/Alabama> <http://dbpedia.org/ontology/wikiPageWikiLink> <http://dbpedia.org/resource/Andrew_Jackson> .
```

I used <kbd>master_clean.py</kbd> to parse and clean the page links, removing redirects and duplicates, and incorporating titles and page types. It assembles a dictionary of all the information within the raw data file.

```python
def assemble_dict(link_path, redirects):
    """Iterates through the pagelinks file and returns a dictionary containing
    information about the page, its unique code, and what it links to."""

    with open(link_path, 'r') as paths:
        paths.next()
        data = {}
        id_counter = 0
        for line in paths:
            l = line.split()
            start = parse_url(l[0])
            end = parse_url(l[2])
            if end[:5] == "File:" or start in redirects:
                continue
            if start not in data:
                sid = id_counter
                id_counter += 1
            if end not in data:
                eid = id_counter
                id_counter += 1
            else:
                eid = data[end]['code']
            data.setdefault(start, {'code': sid, 'title': start,'links': set()})['links'].add(eid)
            data.setdefault(end, {'code': eid, 'title': end,'links': set()})
    return data
```

Wikipedia is big! The raw data include over 172 million relationships. After cleaning, the complete graph has just over 11 million nodes and 127 million edges. The data are stored in two tsv files: a list of all relationships (*start, end*) and a list of all nodes (*node, name, label, degrees*).

__nodes.tsv__
```
node    name            l:label    degrees
0       Alabama         Pages      83
1       Andrew Jackson  Pages      51
```
__rels.tsv__
```
start   end type
0       1   LINKS_TO
2       3   LINKS_TO
```
I used Michael Hunger's [batch import tool](https://github.com/jexp/batch-import/tree/20) to insert the data into a [Neo4j](http://neo4j.com/) graph database. Then, I applied a constraint on all nodes that their id ('node') was unique (using Neo4j's browser interface).
```
CREATE CONSTRAINT ON (p:Page) ASSERT p.node IS UNIQUE;
```

At this point, after some initial queries, I realized that a responsive query of such a large database would take some refinement (see [Improving query response time](#improving-query-response-time) below) and I wanted to figure out how to display my data first. I wrote <kbd>pres_clean.py</kbd> to sample the pagelinks file for only those pages and links that include the names of U.S. Presidents. After cleaning, this graph had 77 thousand nodes and 137 thousand relationships. All of my initial testing and design used this subgraph until I could decrease the response time.

Complete graph | Subgraph
-------------- | -----------
11m nodes | 77k nodes 
127m links | 137k links

#### Queries
I used Nigel Small's Python library [py2neo](http://nigelsmall.com/py2neo/1.6/) to interact with Neo4j's RESTful web service interface. <kbd>query.py</kbd> translates my shortest-path request into a CypherQuery object, queries the database, and returns the results as a Path object. 
```python
query = neo4j.CypherQuery(
    graph_db, 
    """MATCH (m:Page {node:{n1}}), (n:Page {node:{n2}}), 
    p = shortestPath((m)-[*..20]->(n)) RETURN p"""
)
query.execute(n1=node1, n2=node2)
```
The script then traverses this path object, pulling out and deduping nodes and relationships. The ids need to be recoded to be sequential, starting from 0. Finally, the nodes and relationships are formatted and returned as JSON.
```
{
    "directed": true,
    "nodes": [
        {
            "degrees": 22,
            "node": 0,
            "name": "William Persse",
            "group": "path"
        },
        {
            "degrees": 102,
            "node": 1,
            "name": "George Washington",
            "group": "path"
        },
        {
            "degrees": 35,
            "node": 2,
            "name": "American Presidents: Life Portraits",
            "group": "none"
        }
    ],
    "links": [
        {
            "start": 0,
            "end": 1,
            "value": 1
        },
        {
            "start": 1,
            "end": 2,
            "value": 0
        }
    ],
    "multigraph": false
}
```

#### Data visualization
<kbd>wikigraph.py</kbd> is a small [Flask](http://flask.pocoo.org/) app that connects the database's reponse to the [d3 library](http://d3js.org/). <kbd>graph.js</kbd> handles the graph drawing while <kbd>index.js</kbd> handles everything else.

Wikipedia page images are sourced from the [Wikimedia API](http://www.mediawiki.org/wiki/API:Main_page) via two AJAX requests: once for the start and end nodes upon the query request, and then for the inner path nodes once the result is received.

#### User input
To help users input page names correctly (and to suggest possible queries) I implemented a predictive seach with [typeahead.js](https://twitter.github.io/typeahead.js/). Via an AJAX call, it queries an indexed [SQLite](http://www.sqlite.org/) database that holds the page titles and their codes.

#### Improving query response time
At the start of the project, I decided there were at least four possible approaches to improve response time:
- [x] Scale vertically (tweak memory allocation, use larger machine)
- [x] More efficient query (change query parameters, possibly rewrite algorithm)
- [ ] Prune graph if possible (remove trailing linked tails?)
- [ ] Scale horizontally (distributed processing, e.g. [Giraph](http://giraph.apache.org/))

#####Scale vertically
My first approach to improve response time for the full database was to fiddle with Neo4j's memory settings. The settings in **neo4j.properties** (e.g. *neostore.nodestore.db.mapped_memory*) didn't have a large impact on query time. I had more success with *java.initmemory* and *java.maxmemory* (in **neo4j-wrapper.conf**).

Each time I increased both init and max memory, I ran the same query three times and recorded the response time. My MacBook Air has 4G of RAM, which seems to coincide with the dramatic improvement in query time (1400s to 60s) after passing the 4G mark. 

![Memory Test Results](static/images/mem_test.png)

Then, I deployed the database to a larger machine (see [Deployment](#deployment) below). I scaled the java memory settings to the new specs, but the query time only halved (60 sec to 30 sec) despite the four-fold increase in RAM.

#####Query efficiency
I received advice from the [Neo4j Google Group](https://groups.google.com/forum/#!forum/neo4j) that the lookup of the two nodes was likely the slowest factor (rather than the pathfinding algorithm). Here is my initial query:
```python
query = neo4j.CypherQuery(
    graph_db, 
    """MATCH (m {node:'%s'}), (n {node:'%s'}), 
    p = shortestPath((m)-[*..20]->(n)) RETURN p""" % (node1, node2)
)
query.execute_one()
```
I added a constraint in the database for the Page label (all nodes are Pages) to express that node id is unique:
```
CREATE CONSTRAINT ON (p:Page) ASSERT p.node IS UNIQUE;
```
And then I modified my query to use the Page label in the node lookup, as well as pass the nodes as arguments (instead of via string substitution):
```python
query = neo4j.CypherQuery(
    graph_db, 
    """MATCH (m:Page {node:{n1}}), (n:Page {node:{n2}}), 
    p = shortestPath((m)-[*..20]->(n)) RETURN p"""
)
query.execute(n1=node1, n2=node2)
```
Surprisingly, auto-indexing had no effect on this query. I'd had it turned on (and assigned to index on 'node', e.g. id), but it was not adding efficiency. The constraint added via the Page label increased the speed with which the database finds the two nodes.

#### Deployment
This code was tested on Amazon's [EC2](http://aws.amazon.com/ec2/) using [Apache](http://httpd.apache.org/) as a web server. The database is housed on a 30 GiB EBS. Currently it is on an r3.large server with 15G RAM, and the query of the full database takes just 0.5 seconds. Since EC2 servers do not come with virtual memory, I set up the 32G SSD ephemeral instance storage as a paging (or swap) partition to give the database access if needed.