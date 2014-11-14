Wikigraph
===========
Let's consider Wikipedia as a graph, with pages as nodes and inter-page links as edges. What's the shortest path between any two pages? For example, how many links do you have to click to get from Harry Potter to the Spanish Inquisition? 

This project is my attempt to answer this question. In the process, I explore:
* graph traversal (shortest path)
* graph databases (Neo4j)
* object-oriented programming in Python (py2neo library)
* data visualization (d3, Javascript)
* web microframeworks (Flask)
* cloud services (Amazon EC2)
* web servers (Apache)

###Core product
Web interface that allows users to query a graph database of Wikipedia's page links and find/explore the shortest path between any two pages.

###Features
- [x] Clean raw data files into nodes and relationships .csv files
- [x] Wikipedia page links imported into a graph database
- [x] Smaller subgraph of U.S. presidents imported into a graph database
- [x] Python wrapper queries database for shortest path between two nodes
- [x] Python script outputs path and secondary relationships as a JSON object
- [x] d3 library reads subgraph and returns a visualization
- [x] Flask app renders html and handles AJAX requests to the database
- [x] Flask app and database moved to EC2 server, Apache enables connection
- [ ] Users can input page titles and they are converted to codes
- [ ] Error handling for non-existent paths and bad user input
- [ ] The secondary nodes and relationships returned are ranked by their connectance score
- [ ] Users can search for page titles (typeahead.js?)
- [ ] Embed title, abstract, photo on nodes in visualization (Wikipedia API?)
- [ ] Query time reduced enough to use the complete Wikipedia graph
    - Scale vertically (add more memory allocation, use larger machine)
    - Prune graph if possible (remove trailing linked tails?)
    - Scale horizontally (distributed processing with Giraph)
    - More efficient query (change parameters, possibly rewrite algorithm)

###The graphs
I downloaded RDF files (.ttl) for page links, titles, redirects, and ontology from [DBPedia](http://wiki.dbpedia.org/Downloads39). I used <kbd>master_clean.py</kbd> to parse and clean the page links, removing redirects and duplicates, and incorporating titles and page types.

Wikipedia is pretty big! The raw data include over 172 million relationships. After cleaning, the complete graph has just over 11 million nodes and 127 million edges. The data are stored in two csv files, one for each relationship (*source, target*) and one for each unique node (*id, name, type*).

I used Michael Hunger's [batch import tool](https://github.com/jexp/batch-import/tree/20) to insert the data into a [Neo4j](http://neo4j.com/) graph database.

At this point, after some initial queries, I realized that a responsive query of such a large database would take some refinement and I wanted to figure out how to display my data first. I wrote <kbd>pres_clean.py</kbd> to sample the pagelinks file for only those pages and links that include the names of U.S. Presidents. After cleaning, this small subgraph had 77 thousand nodes and 137 thousand relationships. For now, everything that follows uses this smaller subgraph.

Complete graph | Small graph
-------------- | -----------
11m nodes | 77k nodes 
127m links | 137k links

###Queries
I used Nigel Small's Python library [py2neo](http://nigelsmall.com/py2neo/1.6/) to interact with my database's RESTful web service interface. I wrote <kbd>query.py</kbd> to translate my shortest-path request into a CypherQuery object, queries the database, and returns the results as a Path object. 

```python
query = neo4j.CypherQuery(
    graph_db, 
    """MATCH (m {node:'%s'}), (n {node:'%s'}), 
    p = shortestPath((m)-[*..20]->(n)) RETURN p""" % (node1, node2)
)
path = query.execute_one()
```

The script then traverses this path object, pulling out and deduping nodes and relationships. The ids need to be recoded to be sequential, starting from 0. Finally, the nodes and relationships are formatted and returned as JSON.

I wrote <kbd>wikigraph.py</kbd>, a small [Flask](http://flask.pocoo.org/) app, to connect this reponse to the [d3 library](http://d3js.org/). <kbd>graph.js</kbd> handles the graph drawing while <kbd>index.js</kbd> handles everything else.

###Deployment
I deployed the graph database and Flask app on Amazon's [EC2](http://aws.amazon.com/ec2/), and used [Apache](http://httpd.apache.org/) to broadcast the server.