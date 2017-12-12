const cheerio = require('cheerio'),
	  fs = require('fs'),
	  express = require('express'),
	  request = require('request'),
	  MongoClient = require('mongodb').MongoClient,
	  assert = require('assert')
	  async = require('async');
// End dependecies

// Initialize express
const app = express();

// The initial page ID
var currentPageID = 2;

// Relevant URLs
var mongoUrl = 'mongodb://localhost:27017/football-mania';

// The scraped data
var dateOfMatch = "";
var timeOfMatch = "";
var linkOfMatchHighlights = "";

var matchData = "";
var matchDataJSON = "";
var mediaData = "";
var mediaDataJSON = "";

// Express Routing
app.get('/scrape', function(req, res) {

	async.whilst (
		function () { return currentPageID > 0; },
		function (next) {
			const currentPageUrl = 'http://footyroom.com/posts-pagelet?page=' 
									+ currentPageID;

			// Making request to the current page of the site
			console.log('####################');
			request (currentPageUrl, function(err, resp, body) {
				var allCurrentPageUrls = [];

				if(!err) {
					const $ = cheerio.load(body);

					$('a', '.vidTop').each(function() {
						let matchUrl = $(this).attr('href');
						allCurrentPageUrls.push(matchUrl);
					})
				} 

				var currentArrayIndex = allCurrentPageUrls.length - 1;

				// Making requests to the individual match URLs
				async.whilst (
					function () { return currentArrayIndex >= 0; },
					function (nextUrl) {
						request (allCurrentPageUrls[currentArrayIndex], function(err, resp, body) {
							//console.log(allCurrentPageUrls[currentArrayIndex]);
							if (!err) {
								const $ = cheerio.load(body);

								// fs.writeFile(__dirname + '/data.html', body, (err) => {
								// 	if (err) throw err;
								// 	console.log('HTML of the link posted');
								// })

								const regexForLink = /\[\{".*\}\]/;
								mediaData = $('script').eq(22).html();
								mediaDataJSON = JSON.parse(regexForLink.exec(mediaData));
								
								if (mediaDataJSON[0]['source'].indexOf('goalsarena') !== -1) {
									const regexForPlaywire = 
										/(?:config\.playwire\.com\\\/[0-9]{5}\\\/videos\\\/v2\\\/)([0-9]*)/;
									let videoID = regexForPlaywire.exec(mediaData)[1];
									linkOfMatchHighlights = 
										'https://cdn.video.playwire.com/21772/videos/' + videoID 
											+ '/video-sd.mp4';
								} else {
									linkOfMatchHighlights = mediaDataJSON[0]['source'];
								}
						
								matchData = $('script').eq(25).html().substring(23);
								matchDataJSON = JSON.parse(matchData);

								dateOfMatch = $('.mph-info ul li').eq(0).find('strong').text();
								timeOfMatch = $('.mph-info ul li').eq(1).find('strong').text();

								matchDataJSON['timeOfMatch'] = timeOfMatch;
								matchDataJSON['dateOfMatch'] = dateOfMatch;
								matchDataJSON['linkOfMatchHighlights'] = linkOfMatchHighlights;
								console.log(matchDataJSON);
							}
							// Database Handling 

							// MongoClient.connect(mongoUrl, function(err, db) {
							// 	assert.equal(null, err);
							// 	console.log("Connected succesfully to server");

							// 	db.collection('main').insert({ y : 5 });

							// 	db.close();
							// })

							currentArrayIndex--;
							setTimeout (function () {
								nextUrl();
							}, 2000)
						})
					},
					function (err) {
						// All things are done!
					}
				)

				currentPageID--;
				setTimeout (function () {
					next();
				}, 3000)	
			})
			console.log('####################');
		},
		function (err) {
			// All things are done!
		}
	)
	res.end();
})

// Starting the server
app.listen(3000, function() {
	console.log('Server is listening at port 3000');
})
