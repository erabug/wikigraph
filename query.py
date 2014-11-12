from py2neo import neo4j
import json
import sys
import time

def find_shortest_path(node1, node2):
	"""Connect to graph database, then create and send query to graph database. 
	Returns the shortest	path between two nodes.
	Format: (67149)-[:'LINKS_TO']->(421)"""

	graph_db = neo4j.GraphDatabaseService()

	t0 = time.time()
	query = neo4j.CypherQuery(
		graph_db, 
		"""MATCH (m {node:'%s'}), (n {node:'%s'}), 
		p = shortestPath((m)-[*..20]->(n)) RETURN p""" % (node1, node2)
		)

	path = query.execute_one()
	t1 = time.time()

	print "Shortest Path:", path
	print "Time elapsed: %.2f seconds." % (t1 - t0)

	return path

def parse_node(node, in_path):
	"""Extract name and id from a node. Returns a dict of information."""

	n, name = node.get_properties().values()
	name = name.replace('_', ' ')

	node_dict = {'id': n, 'name': name, 'group': 'none'}

	labels = node.get_labels()
	label = labels - set(['Page']) # does it have a label other than Page?
	if label:
		node_dict['type'] = list(label)[0]

	if in_path:
		node_dict['group'] = 'path'

	return node_dict

def parse_rel(rel, in_path):
	"""Extract node id from a relationship. Returns a dict of information."""

	s = rel.start_node.get_properties()['node'] # id for start node
	e = rel.end_node.get_properties()['node'] # id for end node
	rel_dict = {'source': int(s), 'target': int(e), 'value': 0}

	if in_path:
		rel_dict['value'] = 1

	return rel_dict

def parse_rel_objs(rel_objs_list, in_path=False):
	"""Takes a list of relationship objects, returns list of rel dicts."""

	rel_dict_list = []

	for rel in rel_objs_list:

		rel_dict = parse_rel(rel=rel, in_path=in_path)
		rel_dict_list.append(rel_dict)

	return rel_dict_list

def find_primary_rels(node_list):
	"""Take a list of node objects, returns list of node dicts."""

	rels = []

	for node in node_list:

		for rel in node.match_incoming(limit=2):
			rels.append(rel)
		for rel in node.match_outgoing(limit=2):
			rels.append(rel)

	rel_dict_list = parse_rel_objs(rels)

	return rel_dict_list

def cool_func(path):

	path_rels = parse_rel_objs(rel_objs_list=path.relationships, in_path=True)
	print "path_rels:", path_rels
	non_path_rels = find_primary_rels(node_list=path.nodes)
	print "non_path_rels", non_path_rels
	rels_list = path_rels + non_path_rels

	



	return rels_list
		
# def create_rels_list(path):
# 	"""Given the returned path, create a dict for each relationship. Returns 
# 	list of dicts. 
# 	Format: [{'source': 42, 'target': 552}]"""

# 	rels_list = []

# 	for rel in path.relationships:
# 		start_node = rel.start_node.get_properties()['node']
# 		end_node = rel.end_node.get_properties()['node']
# 		rels_list.append({'source': int(start_node), 'target': int(end_node), 'value': 1})

# 	return rels_list

# def create_nodes_list(path):
# 	"""Given the returned path, create a dict for each node. Returns list of 
# 	dicts. 'Type' is included when available.
# 	Format: [{'node': 42, 'name': 'Douglas Adams', 'group': 'path'}]"""

# 	nodes_list = []

# 	for a_node in path.nodes:

# 		node, name = a_node.get_properties().values()
# 		name = name.replace('_', ' ')
# 		node = int(node)

# 		d = {'id': node, 'name': name, 'group': 'path'}

# 		labels = a_node.get_labels()
# 		label = labels - set(['Page']) # does it have a label other than Page?
# 		if label:
# 			d['type'] = list(label)[0]

# 		nodes_list.append(d)

# 	return nodes_list

# def create_lists(node1, node2):
# 	"""Request the shortest path between two nodes from the database. Assemble 
# 	list of nodes and relationships from the path, then process	to recode their 
# 	IDs. Write output to a JSON file."""

# 	path = find_shortest_path(str(node1), str(node2))
# 	rels_list = create_rels_list(path)
# 	nodes_list = create_nodes_list(path)

# 	codes = {}
# 	id_counter = 0

# 	for node in nodes_list: # create a dict to translate id codes
# 		node_id = node['id']
# 		if node_id not in codes:
# 			codes[node_id] = id_counter
# 			id_counter += 1
# 		node['id'] = codes[node_id]

# 	for rel in rels_list: # look up the source and target in codes
# 		rel['source'] = codes[rel['source']]
# 		rel['target'] = codes[rel['target']]

# 	response = '{ "directed": true, "nodes":' + json.dumps(nodes_list) + ', "links":' + json.dumps(rels_list) + ', "multigraph": false }'
	
# 	# with open('static/response.json', 'wb') as w:
# 	# 	w.write(response)

# 	return response

if __name__ == '__main__':
	# f, node1, node2 = sys.argv
	# create_lists(node1, node2)
	path = find_shortest_path('1', '4')
	cool_func(path)

