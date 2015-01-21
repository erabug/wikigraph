function getSummaryImages(numPages, pageParams) {
    queryURL = makeQueryURL(60, numPages, pageParams);
    $.getJSON(
        queryURL,
        function(data) {
            var pageObject = data.query.pages;
            Object.keys(pageObject).forEach(function(pageKey) {
                item = createThumbnailObject(pageObject[pageKey]);
                code = getPathCode(item.title);
                queryInfo[code].tinyurl = item.thumbnail;
                queryInfo[code].tinyHeight = item.height;
                queryInfo[code].tinyWidth = item.width;
            });
            displaySummary(response.path);
        });
}

function displaySummary(path) {
    // draw SVG based on length of path
    var svg = d3.select(".summary").append("svg")
        .attr("width", 200)
        .attr("height", function(d) {
            return 50 * path.length;
        });

    var defs = svg.append("defs");

    // define clip paths for each path node
    Object.keys(queryInfo).forEach(function(key) {
        defs.append("clipPath")
            .attr("id", 'timg' + key.toString())
          .append("circle")
            .attr("r", 20);
    });

    // establish nodes
    var tinyNode = svg.selectAll("g.tinyNode")
            .data(path)
        .enter().append("svg:g")
            .attr("class", "tinyNode")
            .attr("transform", function(d) { // nodes are placed based on order
                var index = queryInfo[d.code].code;
                var yValue = 25 + (index * 50);
                return "translate(23, " + yValue + ")";
            })
            .attr("id", function(d) {return d.title + '|' + d.code;});

    // append clip-path to each path node
    tinyNode.append("image")
        .attr("xlink:href", function(d) {
            return queryInfo[d.code].tinyurl;
        })
        .attr("x", function(d) { return -queryInfo[d.code].tinyWidth / 2;})
        .attr("y", function(d) {
            var imgHeight = queryInfo[d.code].tinyHeight;
            var offset;
            if (h > queryInfo[d.code].tinyWidth) {
                offset = 6;
            } else {
                offset = 0;
            }
            return -(imgHeight / 2) + offset;
        })
        .attr("height", function(d) { return queryInfo[d.code].tinyHeight;})
        .attr("width", function(d) { return queryInfo[d.code].tinyWidth;})
        .attr("clip-path", function(d) {
            var clipPathID = 'timg' + d.code;
            return "url(#" + clipPathID + ")"; // unique clip path for this node
        });

    // append empty circle to nodes as an outline
    tinyNode.append("circle")
        .attr("r", 20)
        .style("stroke", "#333")
        .style("stroke-width", "2px")
        .style("fill", "none");

    tinyNode.append("foreignObject") // necessary for wrapped title strings
        .attr({width: 145, height: 45})
        .attr({x: 30, y: function(d) {
            var len = d.title.length;
            if (len > 42) {
                return -22;
            } else if (len > 20) {
                return -12;
            } else {
                return -6;
            }
        }})
        .append("xhtml:body")
        .append("xhtml:div")
        .style({
            "font-size": "14px",
            "text-align": "left",
            "padding-left": "1px"
        })
        .html(function(d) {return d.title;});

}

