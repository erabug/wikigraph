import time
import urllib2

def redirects_dict(redirects_path):
    """Iterates through the redirects file and creates a set of redirect page 
    names."""

    redirects = {}
    with open(redirects_path, 'rb') as reds:
        for line in reds:
            l = line.split('\t')
            source = l[0]
            target = l[1].rstrip()
            redirects.setdefault(source, target)

    return redirects

def convert_to_unicode(title):
    title = urllib2.unquote(title)
    return title

def assemble_dict(link_path, redirects):
    """Iterates through the pagelinks file and returns a dictionary containing
    information about the page, its unique code, and what it links to (if 
    anything).

    Example of returned dictionary: 
    {'page1': {'code': 41, 
               'title': 'page1', 
               'links': set([42, 108])}}"""

    with open(link_path, 'rb') as paths:
        data = {}
        counter = 50000
        foo = 0
        code_counter = 0

        t0 = time.time()
        for line in paths:
            if counter > 0:
                l = line.split('\t')
                start = l[0]
                end = l[1].rstrip()

                if end[:5] == "File:" or end[:9] == "Category:":
                    continue

                if start in redirects or start == end:
                    continue

                if end[:2] == "S:" or end[:4] == "Help:":
                    continue

                if '%' in start:
                    start = convert_to_unicode(start)

                if '%' in end:
                    end = convert_to_unicode(end)

                if end in redirects: # if start points to a redirect page
                    end = redirects[end] # replace it with the real page

                if start not in data: 
                    sid = code_counter # assign the page a code
                    code_counter += 1

                if end not in data:
                    eid = code_counter # assign the page a code
                    code_counter += 1
                else:
                    eid = data[end]['code'] # else look up its code in data

                if data.get(start, 0) == 0:
                    data[start] = {'code': sid, 
                                   'title': start, 
                                   'links': {eid}}
                else:
                    data[start]['links'].add(eid)

                if data.get(end, 0) == 0:
                    data[end] = {'code': eid, 
                                 'title': end, 
                                 'links': set()}

                foo += 1
                if foo % 10000000 == 0:
                    x = foo/1000000
                    y = (time.time() - t0)/60
                    print "%d million lines read in %.2f minutes" % (x, y)
  
                counter -= 1
            else: 
                break

    return data

def recode_dict(data):
    """Returns a dictionary of codes with pages as keys. If the page has 
    outgoing links, its value is a new code; otherwise, its value is None.

    Example of returned dictionary:
    {{41: None}, {23: None}, {45: 2}}"""

    codes = {}


    # iterate through data, give new code to pages that have outgoing links
    code_counter = 0
    for value in data.values():
        if value['links']:
            codes[value['code']] = code_counter
            code_counter += 1
        else:
            codes[value['code']] = None
    return codes

def prune_data(data, codes):
    """Returns a dictionary of page links with continuous, sequential codes
    that have at least one outgoing link. Also adds a field for degrees.

    Example of returned dictionary:
    {'page1': {'code': 41, 
               'title': 'page1', 
               'degrees': 2, 
               'links': set([42, 108])}}"""
    
    # add information to new dict for pages with outgoing links    
    pruned_data = {}
    for i in data.keys():
        value = data.pop(i)
        if value['links']:
            new_links = set()
            for link in value['links']: # iterate through the set of links
                if codes.get(link) != None:
                    new_links.add(codes[link])
            if new_links:
                title = value['title']
                pruned_data[title] = {'code': codes[value['code']],
                                       'title': title,
                                       'degrees': len(new_links),
                                       'links': new_links}

    return pruned_data

def write_rels(data, rels_path):
    """Iterates through the information dictionary and writes the results to 
    the rels.tsv file (node, name, label, degrees)."""
    
    with open(rels_path, 'wb+') as rels:
        rels.write('start\tend\ttype\n') # write headers
        # grab each key, iterate through its values to write lines to rels.tsv
        for key, value in data.iteritems():
            for lk in value['links']:
                rels.write(str(value['code']) + '\t' + str(lk) + '\tLINKS_TO\n')

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
    """Creates a tsv file for page links and one for pages. First it assembles 
    a dictionary of redirect pages, then uses that to create a dictionary of 
    deduped page links. It then parses the dictionary of links to write the 
    two files."""

    print "Creating set of redirect pages..."
    redirects = redirects_dict('data/cleaned_redirects.tsv')
    print "Reading page links..."
    data = assemble_dict('data/cleaned_links.tsv', redirects)
    print "Page links dictionary created (length: %d)" % len(data)
    print "Creating dictionary of new codes..."
    codes = recode_dict(data)
    print "Pruning data..."
    pruned_data = prune_data(data, codes)
    print "Page links dictionary pruned (length: %d)" % len(pruned_data)
    print "Writing 'rels.tsv'..."
    write_rels(pruned_data, 'data/rels.tsv')
    print "Writing 'nodes.tsv'..."
    write_nodes(pruned_data, 'data/nodes.tsv')

if __name__ == "__main__":
    clean_data()