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
        # counter = 500000
        foo = 0
        code_counter = 0

        t0 = time.time()
        for line in paths:
            # if counter > 0:
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
  
            #     counter -= 1
            # else: 
            #     break

    return data

def find_deadends(data):

    # iterate through data, if empty set, add to dead
    deadends = set()
    keys = data.keys()
    for key in keys:
        value = data[key]
        if not value['links']:
            deadends.add(value['code'])
            del data[key] # remove key from data

    return keys, deadends

def prune_deadends(data, deadends, keys):

    # iterate through data, if link in deadends, remove it
    for key in keys:
        value = data.get(key)
        if value != None:
            links = value['links'].copy()
            for link in links:
                if link in deadends:
                    value['links'].remove(link)

def recode_data(data):

    # iterate through data, assign new code to every entry
    code_counter = 0
    for value in data.values():
        value['code'] = code_counter
        code_counter += 1

def write_rels(data, rels_path):
    """Iterates through the information dictionary and writes the results to 
    the rels.tsv file (node, name, label, degrees)."""
    
    with open(rels_path, 'wb+') as rels:
        rels.write('start\tend\ttype\n')
        for value in data.values():
            for lk in value['links']:
                rels.write(str(value['code']) + '\t' + str(lk) + '\tLINKS_TO\n')

def write_nodes(data, nodes_path):
    """Iterates through the information dictionary (sorted by code number)
    and writes the results to the nodes.tsv file (code, title, label, degrees).
    """

    with open(nodes_path, 'wb+') as nodes:
        nodes.write('node\tname\tl:label\tdegrees\n')
        # sort the nodes by code (list of tuples) before writing
        for page in sorted(data.values(), key=lambda k: k['code']):
            code = str(page['code'])
            deg = str(len(page['links']))
            nodes.write(code + '\t' + page['title'] + '\tPage\t'+ deg + '\n')

def clean_data():
    """Creates a tsv file for page links and one for pages. First it assembles 
    a dictionary of redirect pages, then it creates a page link dictionary, 
    filtering out redirects and specific page types. Then, pages with no 
    outgoing links are removed and their code is added to a 'deadend' set. Then,
    pages in the dictionary remove links to pages in the 'deadend set'. Finally,
    the dictionary is parsed and information is written to two .tsv files."""

    print "Creating set of redirect pages..."
    redirects = redirects_dict('data/cleaned_redirects.tsv')
    print "Reading page links..."
    data = assemble_dict('data/cleaned_links.tsv', redirects)
    raw_length = len(data)
    print "Page links dictionary created with %d pages." % raw_length
    print "Finding deadends..."
    keys, deadends = find_deadends(data)
    print "Pruning %d deadends..." % len(deadends)
    prune_deadends(data, deadends, keys)
    print "Recoding data..."
    recode_data(data)
    perc = (len(data)/float(raw_length))*100
    print "Pages pruned, now has %d pages (%.2f%% of original)." % (len(data), perc)
    print "Writing 'rels.tsv'..."
    write_rels(data, 'data/rels.tsv')
    print "Writing 'nodes.tsv'..."
    write_nodes(data, 'data/nodes.tsv')

if __name__ == "__main__":
    clean_data()