var CODES; // this object will be populated once the user inputs two pages
var response; // global variable for the graph db response
var queryImages; // an object to pass information to the graph
var imageURLs; // an array so it will retain order
clear_all();

// tells typeahead how to handle the user input (e.g. the get request params)
var pageNames = new Bloodhound({
    datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.value);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 50,
    remote: {
        url: '/page-names?query=%QUERY',
        // rateLimitBy: 'throttle',
        // rateLimitWait: 100,
        filter: function(pageNames) {
            // Map the remote source JSON array to a JavaScript array
            return $.map(pageNames.results, function(page) {
                return {
                    value: page.title,
                    code: page.code
                };
            });
        }
    }
});

pageNames.initialize(); // initialize the bloodhound

function clear_partial() {
    $('.loading-images').empty();
    $('svg').remove();
    queryImages = {};
    imageURLs = [];
}

function clear_all() {
    CODES = {};
    $('input#start-node').val('');
    $('input#end-node').val('');
    clear_partial();
}

function getThumbnail(pageObject, pageKey) {
    var page = pageObject[pageKey];
    console.log('getting info for:', page);
    var thumbnail, thWidth, thHeight;
    if ('thumbnail' in page) { // if wikipedia query returned a thumbnail
        thumbnail = page.thumbnail.source;
        thWidth = page.thumbnail.width;
        thHeight = page.thumbnail.height;
    } else { // else returns grumpycat
        thumbnail = '../static/images/cat.jpg';
        thWidth = 100;
        thHeight = 100;
    }
    console.log('found item info for:', page.title);
    var item = {'title': page.title,
                'thumbnail': thumbnail,
                'width': thWidth,
                'height': thHeight};
    return item;
}

function addImage(item, node) {
    console.log('adding Image', item, node);
    queryImages[node] = {'url': item.thumbnail,
                         'title': item.title,
                         'height': item.height,
                         'width': item.width};
}

function makeHTMLSnippet(node, thumbnail, title) {
    html = '<div class="page" id="page'+node.toString()+'">'+
           '<div class="squareimg"><img src='+thumbnail+'></div>';
           // +'<div class="page-title">'+title+'</div></div>';
    return html;
}

function addQueryImages(data) {
    var pageObject = data.query.pages;
    var htmlSnippets = {};
    Object.keys(pageObject).forEach(function(pageKey) {
        item = getThumbnail(pageObject, pageKey);
        if (item.title == CODES.node1.title) {node = 0;} else {node = 1;}

        htmlSnippets[node] = makeHTMLSnippet(node, item.thumbnail, item.title);

        addImage(item, CODES['node'+(node+1)].code);
        imageURLs[node] = {'title': item.title,
                           'thumbnail': item.thumbnail};
    });
    return htmlSnippets;
}

function addPathImages(data) {
    var pageObject = data.query.pages;
    Object.keys(pageObject).forEach(function(pageKey) {
        item = getThumbnail(pageObject, pageKey);
        var node;
        response.path.forEach(function(pathNode) {
            if (pathNode.title == item.title) {
               node = pathNode.code;
            }
        });
        addImage(item, node);
    });
}

function makeQueryURL(size, numPages, pagesParams) {
    var queryURL = 'http://en.wikipedia.org/w/api.php' +
                   '?action=query&format=json&redirects&prop=pageimages&' +
                   'pithumbsize='+size+'px&pilimit=' + numPages + '&titles=' +
                   pagesParams + '&callback=?';
    return queryURL;
}

function decodeInput(d, node) {
    CODES[node] = {'title': d.value,
                   'code': d.code.toString()};
    
}

function query() {

    var pagesParams = CODES.node1.title + '|' + CODES.node2.title;
    var queryURL = makeQueryURL(size=150, numPages=2, pagesParams);
    var path = $('.loading-images');

    $.when(

        $.getJSON( // get the start/end images from Wikipedia API
            queryURL,
            function(data) {
                var htmlSnippets = addQueryImages(data);
                console.log("QUERY IMAGES:", queryImages);
                Object.keys(htmlSnippets).forEach(function(node) {
                    path.append(htmlSnippets[node]);
                });
                $('#page0').after('<div class="page loading"></div>');
        }),

        $.get( // get the shortest path from the database
            '/query',
            CODES,
            function(data) {
                console.log("GOT THE CODES");
                response = JSON.parse(data); // decode the JSON
                // path.html('');
                // path.empty();
                console.log('RETURNED PATH:', response.path);
            })

    ).then(function(data) {

        var inner = response.path.slice(1, -1);
        console.log('inner:', inner);
        var numPages = inner.length;

        var innerNodes = [];
        inner.forEach(function(node) {
            innerNodes.push(node.title);
        });
        console.log('innerNodes:', innerNodes);

        var pagesParams;
        if (numPages > 1) {
            pagesParams = innerNodes.join('|');
        } else { pagesParams = innerNodes; }

        var queryURL = makeQueryURL(size=150, numPages, pagesParams);

        if (inner.length === 0) {
            return false;
        } else { // if there are intermediary nodes
            return $.getJSON( // get the inner node images from Wikipedia API
                queryURL,
                function(data) {
                    addPathImages(data); //updates queryImages with inner ndoes
                    console.log("QUERY IMAGES:", queryImages);
                    // updates queryImages with index numbers for ordering
                    response.path.forEach(function(node) {
                        // console.log('node.code', node.code);
                        queryImages[node.code].code = response.path.indexOf(node);
                    });
                });
        }
    }).then(function() {
        path.empty();
        drawGraph(response.results);
        sideBar();
    });
}

function sideBar() {

    // get tiny images for the path nodes
    var pathNodes = [];
    response.path.forEach(function(node) {
        pathNodes.push(node.title);
    });
    console.log('queryURL:', pathNodes.join('|'));

    queryURL = makeQueryURL(size=60, pathNodes.length, pathNodes.join('|'));
    $.getJSON(
        queryURL,
        function(data) {
            // console.log('TINY IMAGES RETURNED', data);
            var pageObject = data.query.pages;
            Object.keys(pageObject).forEach(function(pageKey) {
                item = getThumbnail(pageObject, pageKey);
                response.path.forEach(function(pathNode) {
                    if (pathNode.title == item.title) {
                        node = pathNode.code;
                    }
                });
                queryImages[node].tinyurl = item.thumbnail;
                queryImages[node].tinyHeight = item.height;
                queryImages[node].tinyWidth = item.width;
            });
            console.log('queryImages with tiny images:', queryImages);
            displaySummary(response.path);
        });

    
    $('.node').mouseover(function(e) {
        $('.details').toggleClass('hidden');
        var info = this.id.split('|');
        $('.page-title').html(info[0]);
        if (info[1] in queryImages) {
            console.log('already have this image in queryImages:', info[1], queryImages);
            $('.page-image').html('<img src='+queryImages[info[1]].url+' style="border:solid 2px #666; background-color: #fff">');
        } else {
            var queryURL = makeQueryURL(size=150, numPages=2, info[0]);
            $.getJSON(
                queryURL,
                function(data) {
                    var pageObject = data.query.pages;
                    Object.keys(pageObject).forEach(function(pageKey) {
                        item = getThumbnail(pageObject, pageKey);
                        addImage(item, info[1]);
                    });
                    console.log('UPDATED QUERY IMAGES:', queryImages);
                    $('.page-image').html('<img src='+queryImages[info[1]].url+' style="border:solid 2px #666; background-color: #fff">');
                });
        }
    });

    $('.node').mouseout(function(e) {
        $('.details').toggleClass('hidden');
        $('.page-image').empty();
        $('.page-title').empty();
        $('.page-extract').empty();
    });
}


function feelingLucky(inputField, node) {
    $.get(
        '/page-names',
        'query='+inputField.val(),
        function(data) {
            result = data.results[0]; // uses the first result
            inputField.val(result.title);
            CODES[node] = {'title': result.title,
                           'code': result.code.toString()};
            if (CODES.node1 !== undefined & CODES.node2 !== undefined) {
                query();
            }
    });
}

$('input#random-query').click(function(e) {
    $.get('/random-query',
        function(data) {
            var n1 = data.results[0];
            var n2 = data.results[1];
            CODES.node1 = {'title': n1.title,
                           'code': n1.code.toString()};
            CODES.node2 = {'title': n2.title,
                           'code': n2.code.toString()};
            $('input#start-node').val(n1.title); // fill in the search fields
            $('input#end-node').val(n2.title);
            console.log("CODES:", CODES);
        });
});


// event handler for the query submission
$('input#submit-query').click(function() {
    clear_partial();
    console.log('CODES', CODES);

    var inputField;
    if (!(CODES.node1) || $('#start-node').val() != CODES.node1.title) { // if either/both fields not chosen
        console.log("CODE1 missing");
        inputField = $('#start-node');
        feelingLucky(inputField, 'node1');
    }

    if (!(CODES.node2) || $('#end-node').val() != CODES.node2.title) { // if either/both fields not chosen
        console.log("CODE2 missing");
        inputField = $('#end-node');
        feelingLucky(inputField, 'node2');
    }

    query();
});

// sets up the typeahead on the two input fields
$('.scrollable-dropdown-menu .typeahead').typeahead(null, {
    name: 'pageNames',
    displayKey: 'value',
    source: pageNames.ttAdapter()
});

// records the values chosen for each field as a global var
$('#start-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node1');
});

$('#end-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node2');
});

$('input[type=text]').focus(function(){ // click into the text field, select all
    this.select();
});


