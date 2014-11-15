Wikigraph
===========
Let's consider Wikipedia as a graph, with pages as nodes (vertices) and inter-page links as relationships (edges). What's the shortest path between any two pages? For example, how many links do you have to click to get from Harry Potter to the Spanish Inquisition? 

This project is my attempt to answer this question. In the process, I explore:
* graph traversal (shortest path)
* graph databases (Neo4j)
* object-oriented programming in Python (py2neo library)
* data visualization (Javascript, d3)
* web microframeworks (Flask)
* cloud services (Amazon EC2)
* web servers (Apache)

You can check out the project in progress [here](http://ec2-54-148-102-6.us-west-2.compute.amazonaws.com/).

###Core project
Web interface that allows users to query a graph database of Wikipedia's page links and find/explore the shortest path between any two pages.

###Features
Current
- [x] Clean raw data files into nodes and relationships .csv files
- [x] Wikipedia page links imported into a graph database
- [x] Smaller subgraph of U.S. presidents imported into a graph database
- [x] Python wrapper queries database for shortest path between two nodes
- [x] Python script outputs path and secondary relationships as a JSON object
- [x] d3 library reads subgraph and returns a visualization
- [x] Flask app renders html and handles AJAX requests to the database
- [x] Flask app and database moved to EC2 server, Apache enables connection
- [x] Users can input page titles and they are converted to codes
- [x] Search suggest for page titles (typeahead.js)

Future
- [ ] Error handling for non-existent paths
- [ ] The secondary nodes and relationships returned are ranked by their connectance score
- [ ] Embed title, abstract, photo on nodes in visualization (Wikipedia API?)
- [ ] Query time reduced enough to use the complete Wikipedia graph
    - Scale vertically (add more memory allocation, use larger machine)
    - Prune graph if possible (remove trailing linked tails?)
    - Scale horizontally (distributed processing with Giraph)
    - More efficient query (change parameters, possibly rewrite algorithm)

###The graphs
I downloaded RDF files (.ttl) for page links, titles, redirects, and ontology from [DBPedia](http://wiki.dbpedia.org/Downloads39). I used <kbd>master_clean.py</kbd> to parse and clean the page links, removing redirects and duplicates, and incorporating titles and page types.

```python
def parse_links():
    redirects = redirects_set() # create set of redirects
    names = names_dict() # create dict of name:title
    types = types_dict() # create a dict of name:type

    topics = {}
    data = {}
    id_counter = 0

    with open('data/pres_links.ttl', 'r') as f, open('rels.csv', 'wb+') as c:
        c.write('start\tend\ttype\n') # write header
        f.next() # skip header

        for line in f:
            l = line.split()
            start = l[0][29:-1]
            end = l[2][29:-1]

            if start in topics: # are you currently in a topic?
                if end in topics[start]: # are you a repeat link?
                    continue
                else:
                    topics[start].append(end) # add yourself to topics
            else:
                topics = { start: [end] } # overwrite topics dict with new topic

            if start not in redirects and end[:5] != "File:":
                links = (start, end)
                for link in links:
                    if link not in data: # are you a new link?
                        data[link] = { 'id':   id_counter, 
                                       'name': names.get(link, link) }
                        if types.get(link, 0) != 0: # only add type if it is known
                            data[link].update({'type': types[link]})
                        id_counter += 1
                start_id = str(data[start]['id'])
                end_id = str(data[end]['id'])
                c.write(start_id + '\t' + end_id + '\tLINKS_TO\n') # write line to rels.csv

    data_tup = sorted(data.values(), key=lambda k: k['id']) # sorted list of tuples, allows nodes to be written sequentially
    write_nodes(data_tup) # writes each node to nodes.csv
```

Wikipedia is pretty big! The raw data include over 172 million relationships. After cleaning, the complete graph has just over 11 million nodes and 127 million edges. The data are stored in two csv files, one for each relationship (*start, end*) and one for each unique node (*node, name, label*).

*Raw data:*
```
<http://dbpedia.org/resource/Anarchism> <http://dbpedia.org/ontology/wikiPageWikiLink> <http://dbpedia.org/resource/William_McKinley> .
<http://dbpedia.org/resource/Alabama> <http://dbpedia.org/ontology/wikiPageWikiLink> <http://dbpedia.org/resource/Andrew_Jackson> .
```
*Cleaned data:*

__nodes.csv__
```
node    name            l:label
0       Alabama         Page,AdministrativeRegion
1       Andrew Jackson  Page,OfficeHolder
```
__rels.csv__
```
start   end type
0       1   LINKS_TO
2       3   LINKS_TO
```
I used Michael Hunger's [batch import tool](https://github.com/jexp/batch-import/tree/20) to insert the data into a [Neo4j](http://neo4j.com/) graph database.

At this point, after some initial queries, I realized that a responsive query of such a large database would take some refinement and I wanted to figure out how to display my data first. I wrote <kbd>pres_clean.py</kbd> to sample the pagelinks file for only those pages and links that include the names of U.S. Presidents. After cleaning, this small subgraph had 77 thousand nodes and 137 thousand relationships. For now, everything that follows uses this smaller subgraph.

Complete graph | Small graph
-------------- | -----------
11m nodes | 77k nodes 
127m links | 137k links

###Queries
I used Nigel Small's Python library [py2neo](http://nigelsmall.com/py2neo/1.6/) to interact with my database's RESTful web service interface. <kbd>query.py</kbd> translates my shortest-path request into a CypherQuery object, queries the database, and returns the results as a Path object. 
```python
query = neo4j.CypherQuery(
    graph_db, 
    """MATCH (m {node:'%s'}), (n {node:'%s'}), 
    p = shortestPath((m)-[*..20]->(n)) RETURN p""" % (node1, node2)
)
path = query.execute_one()
```
The script then traverses this path object, pulling out and deduping nodes and relationships. The ids need to be recoded to be sequential, starting from 0. Finally, the nodes and relationships are formatted and returned as JSON.
```
{
    "directed": true,
    "nodes": [
        {
            "id": 0,
            "name": "William Persse"
        },
        {
            "type": "OfficeHolder",
            "id": 1,
            "name": "George Washington"
        },
        {
            "type": "TelevisionShow",
            "id": 2,
            "name": "American Presidents: Life Portraits"
        }
    ],
    "links": [
        {
            "source": 0,
            "target": 1
        },
        {
            "source": 1,
            "target": 2
        }
    ],
    "multigraph": false
}
```
<kbd>wikigraph.py</kbd> is a small [Flask](http://flask.pocoo.org/) app that connects this reponse to the [d3 library](http://d3js.org/). <kbd>graph.js</kbd> handles the graph drawing while <kbd>index.js</kbd> handles everything else.

###Deployment
This code was tested on Amazon's [EC2](http://aws.amazon.com/ec2/) using [Apache](http://httpd.apache.org/) as a web server.