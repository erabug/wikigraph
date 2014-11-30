CODES = {}; // this object will be populated once the user inputs two pages
var response; // global variable for the graph db response
var queryImages = {}; // an object to pass information to the graph
var imageURLs = []; // an array so it will retain order

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
}

function clear_all() {
    CODES = {};
    $('input#start-node').val('');
    $('input#end-node').val('');
    clear_partial();
}

function getThumbnail(pageObject, pageKey) {
    var page = pageObject[pageKey];
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

function makeQueryURL(numPages, pagesParams) {
    var queryURL = 'http://en.wikipedia.org/w/api.php' +
                   '?action=query&format=json&redirects&prop=pageimages&' +
                   'pithumbsize=150px&pilimit=' + numPages + '&titles=' +
                   pagesParams + '&callback=?';
    return queryURL;
}

function decodeInput(d, node) {
    CODES[node] = {'title': d.value,
                   'code': d.code.toString()};
    
}

function query() {


    var pagesParams = CODES.node1.title + '|' + CODES.node2.title;
    var queryURL = makeQueryURL(numPages=2, pagesParams);
    var path = $('.loading-images');


    // $.getJSON( // get the start/end images from Wikipedia API
    //     queryURL,
    //     function(data) {
    //         var htmlSnippets = addQueryImages(data);
    //         console.log("QUERY IMAGES:", queryImages);
    //         Object.keys(htmlSnippets).forEach(function(node) {
    //             path.append(htmlSnippets[node]);
    //         });
    //         $('#page0').after('<div class="page loading"></div>');
    //     // });

    //     $.get( // get the shortest path from the database
    //         '/query',
    //         CODES,
    //         function(data) {

    //             response = JSON.parse(data); // decode the JSON
    //             // path.html('');
    //             console.log('RETURNED PATH:', response.path);
                
    //             var inner = response.path.slice(1, -1);

    //             if (0 < inner.length) { // if there are intermediary nodes

    //                 var numPages = inner.length;
    //                 console.log('numPages', numPages);
    //                 console.log('inner', inner);
    //                 var innerNodes = [];
    //                 inner.forEach(function(node) {
    //                     innerNodes.push(node.title);
    //                 });
    //                 console.log('innerNodes:', innerNodes);
    //                 var pagesParams;
    //                 if (numPages > 1) {
    //                     pagesParams = innerNodes.join('|');
    //                 } else { pagesParams = innerNodes; }
    //                 var queryURL = makeQueryURL(numPages, pagesParams);
    //                 console.log('pagesParams:', pagesParams);
    //                 $.getJSON( // get the inner node images from Wikipedia API
    //                     queryURL,
    //                     function(data) {
    //                         console.log('data', data);
    //                         addPathImages(data); //updates queryImages with inner ndoes
    //                         console.log("QUERY IMAGES:", queryImages);
    //                         // updates queryImages with index numbers for ordering
    //                         response.path.forEach(function(node) {
    //                             console.log('node.code', node.code);
    //                             queryImages[node.code].code = response.path.indexOf(node);
    //                         });
    //                         // console.log("QUERY IMAGES:", queryImages);
    //                         drawGraph(response.results); // graph the results
    //                         createSideBar();
    //                     });
    //             } else {
    //                 drawGraph(response.results);
    //                 createSideBar();
    //             }
    //         });
    //     });

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
                path.html('');
                console.log('RETURNED PATH:', response.path);
            })
        ).then(function(inner) {
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

            var queryURL = makeQueryURL(numPages, pagesParams);

            if (inner.length === 0) {
                return false;
            } else { // if there are intermediary nodes
                return $.getJSON( // get the inner node images from Wikipedia API
                    queryURL,
                    function(data) {
                        console.log('GOT INNER NODE IMAGES');
                        addPathImages(data); //updates queryImages with inner ndoes
                        console.log("QUERY IMAGES:", queryImages);
                        // updates queryImages with index numbers for ordering
                        response.path.forEach(function(node) {
                            console.log('node.code', node.code);
                            queryImages[node.code].code = response.path.indexOf(node);
                        });
                        // console.log("QUERY IMAGES:", queryImages);
                    });
                }
            }).then(function() {
        
            console.log("GRAPH DRAW!");
            drawGraph(response.results);
            createSideBar();
        });
        // });
}

function createSideBar() {
    $('.node').mouseover(function(e) {
        var info = this.id.split('|');
        $('.page-title').html(info[0]);
        if (info[1] in queryImages) {
            $('.page-image').html('<img src='+queryImages[info[1]].url+' style="border:solid 2px #666; background-color: #fff">');
        } else {
            var queryURL = makeQueryURL(2, info[0]);
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
}

$(document).ready(function(e) {
    clear_all();
});

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
            // query();
        });
});

function feelingLucky(inputField, node) {
    $.get(
        '/page-names',
        'query='+inputField.val(),
        function(data) {
            result = data.results[0];
            console.log('returned data:', result);
            inputField.val(result.title);
            CODES[node] = {'title': result.title,
                           'code': result.code.toString()};
            $.data(inputField, 'code', result.code.toString());
            console.log($.hasData(inputField));
    });
}

// event handler for the query submission
$('input#submit-query').click(function(e) {
    clear_partial();
    console.log('CODES', CODES);

    // if (!(CODES.node1) | (!(CODES.node1)) {

    // }
    var inputField;
    if (!(CODES.node1)) { // if either/both fields not chosen
        inputField = $('#start-node');
        feelingLucky(inputField, 'node1');
    }

    if (!(CODES.node2)) { // if either/both fields not chosen
        inputField = $('#end-node');
        feelingLucky(inputField, 'node2');
    }
    
        // if codes isn't full, then query SQLite db
    console.log(CODES.node1);
    // $.when({foo: CODES.node1}).done(function(x){
    //     console.log(x.foo);
    //     query();
    // });
    query();
});


// sets up the typeahead on the two input fields
$('.scrollable-dropdown-menu .typeahead').typeahead(null, {
    // minLength: 3,
    name: 'pageNames',
    displayKey: 'value',
    source: pageNames.ttAdapter()
});

// experimental
// $('.scrollable-dropdown-menu .typeahead').typeahead({
//     name: 'pageNames',
//     remote: '/page-names?query=%QUERY',
//     minLength: 3, // send AJAX request only after user type in at least 3 characters
//     limit: 10 // limit to show only 10 results
// });

// records the values chosen for each field as a global var
$('#start-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node1');
});

$('#end-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node2');
});

$('input[type=text]').focus(function(){
    this.select();
});


