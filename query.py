from py2neo import neo4j
import json, time

def find_shortest_path(node1, node2):
    """Connects to graph database, then creates and sends query to graph 
    database. Returns the shortest path between two nodes.
    Format: (67149)-[:'LINKS_TO']->(421)"""

    graph_db = neo4j.GraphDatabaseService()

    t0 = time.time()

    query = neo4j.CypherQuery(
        graph_db, 
        """MATCH (m:Page {node:{n1}}), (n:Page {node:{n2}}), 
        p = shortestPath((m)-[*..10]->(n)) RETURN p"""
    )
    path = query.execute_one(n1=node1, n2=node2)

    t1 = time.time()

    print "\nShortest Path:", path
    print "Time elapsed: %.2f seconds" % (t1 - t0)

    return path

def parse_node(node, in_path):
    """Extract title and code from a node object. Returns a dict of information."""

    code, deg, title = node.get_properties().values()
    title = title.replace('_', ' ')

    if title == "Basque people": # special exception for a changed redirect
        title = "Basques"

    node_dict = {'code': int(code), 
                 'title': title, 
                 'degrees': deg, 
                 'group': 'none'}

    if in_path:
        node_dict['group'] = 'path'

    return node_dict

def parse_rel(rel, in_path):
    """Extract node code from a relationship object. Returns a dict of 
    information."""

    start_id = rel.start_node.get_properties()['node']
    end_id = rel.end_node.get_properties()['node']

    rel_dict = {'source': int(start_id), 
                'target': int(end_id), 
                'value': 0}

    if in_path:
        rel_dict['value'] = 1

    return rel_dict

def parse_node_objs(node_objs_list, in_path=False):
    """Takes a list of node objects. Returns dict of node dicts."""

    nodes = {}

    for node in node_objs_list:
        node_dict = parse_node(node, in_path=in_path)
        if node_dict['code'] not in nodes:
            nodes[node_dict['code']] = node_dict

    return nodes

def parse_rel_objs(rel_objs_list, in_path=False):
    """Takes a list of relationship objects. Returns list of rel dicts."""

    rel_dict_list = [parse_rel(rel=rel, in_path=in_path) for rel in rel_objs_list]

    return rel_dict_list

def find_other_nodes(node_objs_list):
    """Takes a list of node objects. Returns list of rel dicts and list of
    node dicts."""

    rels = []
    nodes = []

    for node in node_objs_list:

        for rel in node.match_incoming(limit=8):
            rels.append(rel)
            nodes.append(rel.start_node)

        for rel in node.match_outgoing(limit=8):
            rels.append(rel)
            nodes.append(rel.end_node)

    rel_dict_list = parse_rel_objs(rels)
    node_dict_list = parse_node_objs(nodes)
    
    return rel_dict_list, node_dict_list

def merge_node_dicts(path_nodes, npath_nodes):
    """Takes and merges the two dictionaries of node dicts. Returns list of 
    node dicts."""

    d = dict(npath_nodes.items() + path_nodes.items())
    node_dict_list = [node_dict for node_dict in d.values()]

    return node_dict_list

def parse_nodes_and_rels(path):
    """Takes a path object. Returns two lists, one for rel dicts and one for 
    node dicts."""

    # rel dict list for main path
    path_rels = parse_rel_objs(rel_objs_list=path.relationships, in_path=True)

    # parse nodes, create list of unique nodes
    path_nodes = parse_node_objs(node_objs_list=path.nodes, in_path=True)

    # this is a quick/dirty way to grab the names for each path node in order
    path_names = []
    for node in path.nodes:
        path_dict = node.get_properties().values()[0]
        path_names.append({'title': path_nodes[int(path_dict)]['title'], 
                           'code': path_nodes[int(path_dict)]['code']})

    # rel dict list for secondary rels
    npath_rels, npath_nodes = find_other_nodes(node_objs_list=path.nodes)

    # filter out reversed or duplicate paths in the path rels
    for rel in npath_rels:
        for path in path_rels:
            if rel['source'] == path['target'] and rel['target'] == path['source']:
                rel['value'] = 1 # include it in the path
            if rel['source'] == path['source'] and rel['target'] == path['target']:
                npath_rels.remove(rel) # remove duplicates

    # combine the two lists for nodes and rels
    rels_list = path_rels + npath_rels
    nodes_list = merge_node_dicts(path_nodes, npath_nodes)

    return rels_list, nodes_list, path_names

def create_lists(node1, node2):
    """Request the shortest path between two nodes from the database. Assemble 
    list of nodes and relationships from the path, then process to recode their 
    IDs. Write output to a JSON file."""

    path = find_shortest_path(str(node1), str(node2))

    if path:
        
        rels_list, nodes_list, path_names = parse_nodes_and_rels(path)

        codes = {}
        id_counter = 0

        for node in nodes_list: # create a dict to translate id codes
            node_id = node['code']
            if node_id not in codes:
                codes[node_id] = id_counter
                id_counter += 1

        for rel in rels_list: # look up the source and target in codes
            rel['source'] = codes[rel['source']]
            rel['target'] = codes[rel['target']]

        response = """{ "path": %s, "results": { "directed": true, "nodes": %s, 
        "links": %s, "multigraph": false }}""" % (json.dumps(path_names), json.dumps(nodes_list), json.dumps(rels_list))


    else:
        response = '{ "path": None, "results": None }'

    return response

if __name__ == '__main__':
    print create_lists('335354', '3778612') # Abraham Lincoln to Astronomy


