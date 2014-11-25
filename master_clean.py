import os
import urllib2

def parse_url(url):
    """Takes a url, returns the name within it."""

    path, name = os.path.split(urllib2.urlparse.urlparse(url).path)
    return name[:-1]

def redirects_set():
    """Iterates through the redirects file and creates a set of redirect page 
    names."""

    redirects = set()
    with open('data/redirects_en.ttl', 'r') as r:
        for line in r:
            l = line.split()
            name = parse_url(l[0])
            redirects.add(name)
    return redirects # as a set

def assemble_dict(link_path, redirects):
    """Iterates through the pagelinks file and returns a dictionary containing
    information about the page, its unique code, and what it links to."""

    with open(link_path, 'r') as paths:
        paths.next()
        data = {}
        # counter = 100000
        foo = 0
        id_counter = 0
        for line in paths:
            # if counter > 0:
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
                if foo % 10000000 == 0:
                    print "%d lines read!" % foo
                foo += 1
            #     counter -= 1
            # else: 
            #     break
    return data

def write_rels(data, rels_path):
    """Iterates through the information dictionary and writes the results to 
    the rels.tsv file (node, name, label, degrees)."""
    
    with open(rels_path, 'wb+') as rels:
        rels.write('start\tend\ttype\n') # write headers
        # grab each key, iterate through its values to write lines to rels.tsv
        for key, value in data.iteritems():
            link_counter = 0
            for lk in value['links']:
                rels.write(str(value['code']) + '\t' + str(lk) + '\tLINKS_TO\n')
                link_counter += 1
            data[key].update({'degrees': link_counter}) # add degrees here!

def write_nodes(data, nodes_path):
    """Iterates through the information dictionary (sorted by code number)
    and writes the results to the nodes.tsv file (code, title, label, degrees).
    """

    with open(nodes_path, 'wb+') as nodes:
        nodes.write('node\tname\tl:label\tdegrees\n')
        # sort the nodes by code (list of tuples) before writing to nodes.tsv
        for page in sorted(data.values(), key=lambda k: k['code']):
            code = str(page['code'])
            degrees = str(page['degrees'])
            nodes.write(code + '\t' + page['title'] + '\tPage\t'+ degrees + '\n')

def clean_data():

    print "Creating set of redirect pages..."
    redirects = redirects_set()
    print "Reading 'page_links_en.ttl'..."
    data = assemble_dict('data/page_links_en.ttl', redirects)
    #data now looks like: {'page1': {'code': 41, 'title': 'page1', 'links': set([24, 8])}}
    print "Writing 'rels.tsv'..."
    write_rels(data, 'data/rels.tsv')
    print "Writing 'nodes.tsv'..."
    write_nodes(data, 'data/nodes.tsv')

if __name__ == "__main__":
    clean_data()