# TripAdvisor Scraper
Get data from TripAdvisor fast and easily. A scraper is now available for restaurants and hotels. It's suitable for such use cases as scraping TripAdvisor reviews, emails, addresses, awards and many more attributes of hotels and restaurants on TripAdvisor.

# Input - TripAdvisor Crawler
You can either enter the location and download the data from the dataset or send a synchronous request to the actor endpoint and crawl all the information about a single place (hotel, restaurant) in 15 seconds.

*You can either use Search term (location), or use specific ids (place, restaurant or hotel id)
If you use search (I guess primary option) - you can state how many items you want to get (max items), then what content you want to get (attractions, restaurants, hotels - with hotels you can choose a day of check in)
Alternatively, You can scrape review tags from places, and reviews (where you can set if you want to scrape from specific date and limit their number if you want to. You can choose language and currency.

Example json input: But I guess it will be in the input tab?
*

```jsonc
{
     "locationFullName": "London",
     "maxItems": 10,
     "includeRestaurants": true,
     "includeHotels": true,
     "checkInDate": "2020-01-01",
     "includeAttractions": true,
     "includeTags": true,
     "includeReviews": true,
     "maxReviews": 5,
     "lastReviewDate": "2020-01-01",
     "locationId": 4571234,
     "hotelId": 1234567,
     "restaurantId": 123456,
     "language": "en",
     "currency": "USD",
     "proxyConfiguration": {
       "useApifyProxy": true
   },
     "debugLog": true,
   }
```
# Output - TripAdvisor Export
You can extract a variety of data about a single place as well as about a complete location, including some of the most essential information, such as `email`, `phone`, `price` and `reviews`. Data can be downloaded in various formats, such as `JSON`, `CSV`, `XML` and others. For more details, see the [Apify Docs](https://www.apify.com/docs).

**Here is an example of `JSON` output:**
*Output - for hotels - should we have outputs for restaurants and attractions as well? They are all terribly long...*


```json
 [
{
"id": "23143739",
"type": "HOTEL",
"name": "Hotel CUBE Prague",
"awards": [],
"rankingPosition": "4",
"priceLevel": "",
"category": "hotel",
"rating": "5.0",
"hotelClass": "0.0",
"phone": "011420251019811",
"address": "Kremencova 18, Prague 11000 Czech Republic",
"email": "hotelcube@hotelcube.cz",
"amenities": [],
"prices": [],
"latitude": "50.079666",
"longitude": "14.416768",
"webUrl": "https://www.tripadvisor.com/Hotel_Review-g274707-d23143739-Reviews-Hotel_CUBE_Prague-Prague_Bohemia.html",
"website": "http://www.hotelcube.cz/",
"rankingString": "#4 of 683 hotels in Prague",
"rankingDenominator": "683",
"numberOfReviews": "117",
"reviewsCount": 19,
"reviews": [
{
"id": "821754558",
"lang": "en",
"location_id": "23143739",
"published_date": "2021-12-11T22:36:56-05:00",
"published_platform": "Mobile",
"rating": "5",
"type": "review",
"helpful_votes": "0",
"url": "https://www.tripadvisor.com/ShowUserReviews-g274707-d23143739-r821754558-Hotel_CUBE_Prague-Prague_Bohemia.html#review821754558",
"travel_date": "2021-12",
"text": "This Hotel is absolutely awesome ❤️ …. we are nothing missing 👍👍👍 …… Breakfast perfect … rooms clean with all you need …. the place is short from all important things in Prague away and only Feeds are needed …. \n\nThe staff are so friendly and helpfully\n\nThank you Pavel (Office manager) for this perfect stay\n\nThis hotel will be our choice during our next stop in Prague … amazing city 👍🙏👍\n\nHana & Klaus",
"user": {
"user_id": "645D307D9673E836ACD121B90312255C",
"type": "user",
"first_name": null,
"last_initial": null,
"name": null,
"reviewer_type": null,
"contributions": {
"reviews": "1",
"review_city_count": "0",
"restaurant_reviews": "0",
"hotel_reviews": "1",
"attraction_reviews": "0",
"helpful_votes": "0",
"photos_count": "0",
"badges_count": "0"
},
"member_id": "0",
"username": "Trail16898805409",
"user_location": {
"name": null,
"id": null
},
"avatar": {
"small": {
"url": "https://media-cdn.tripadvisor.com/media/photo-t/1a/f6/e3/6a/default-avatar-2020-47.jpg"
},
"large": {
"url": "https://media-cdn.tripadvisor.com/media/photo-l/1a/f6/e3/6a/default-avatar-2020-47.jpg"
}
},
"link": "https://www.tripadvisor.com/MemberProfile-a_uid.645D307D9673E836ACD121B90312255C",
"points": "0",
"created_time": "2021-06-13T09:08:03-0400",
"locale": "de"
},
"title": "no wishes more … perfect and awesome time ❤️🇨🇿❤️",
"owner_response": null,
"subratings": [],
"machine_translated": false,
"machine_translatable": false
}
],
"reviewTags": [
{
"text": "astronomical watch",
"review_count": 2
},
{
"text": "great location for walking",
"review_count": 2
},
{
"text": "hotel is spotless",
"review_count": 2
},
{
"text": "old town",
"review_count": 5
}
]
}
]

```

# How does the TripAdvisor Scraper Work ? 
The whole project was created on the web scraping and automation platform [Apify](https://www.apify.com/) using the [Apify SDK](https://sdk.apify.com/).

# TripAdvisor Scraper Usage
If you want to scrape a lot of hotels and/or restaurants for a given place and write the data to a dataset, the scraper is right for you. If you have problems with accessing TripAdvisor reliably, consider purchasing [Apify proxy](https://apify.com/proxy/) to make sure you enjoy uninterrupted access.

1. __Visit LINK TO Scrapper UI__
2. __Fill input__
3. __Click Run__

We created a simple UI to make interaction easy. but if you prefer doing things yourself, here is an input schema. 

The actor accepts the following `JSON` input:

```json
 {
   "locationFullName": "Prague",
   "includeRestaurants": true,
   "includeHotels": true,
   "includeReviews": true,
   "includeAttraction": true,
   "lastReviewDate": "2019-01-12"
 }
```
 
|Name|Type|Description|
|---|---|---|
|locationFullName |String| Name of location as you would enter it in TripAdvisor search - it is assumed that the location is the first of the search results|
|includeRestaurants|Boolean|If true result includes restaurants|
|includeHotels|Boolean|If true result includes hotels|
|includeReviews|Boolean|If true result includes reviews for every place found|
|includeAttractions|Boolean|If true result includes attractions|
|lastReviewDate|String|Date of last review that is included in results in format `YYYY-MM-DD`|

## API Usage
If you want to get information about a single hotel or restaurant and you don't want it in a single synchronous API call, the API is right for you.

Be aware that it might be impossible to maintain an idle HTTP connection for a long period of time, due to client timeout or network conditions. Make sure your HTTP client is configured to have a long enough connection timeout. If the connection breaks, you will not receive any information about the run and its status. However for a normal location with a reasonable number of reviews (~1000) it should not take more than 20 seconds. You can _paginate_ the reviews using `lastReviewDate` property.

Here is a link to the part of [Apify docs](https://www.apify.com/docs/api/v2#/reference/actors/run-actor-synchronously/with-input) that covers running an actor synchronously. 

### 1. Input
To get information about single `hotel` the request body should be in this format:

```json
{
  "hotelId": "672866",
  "includeReviews": true,
  "lastReviewDate": "2010-01-12"
}
```
To get information about single `restaurant` the request body should be in this format:

```json
{
  "restaurantId": "672866",
  "includeReviews": true,
  "lastReviewDate": "2010-01-12"
}
```

|Name|Type|Description|
|---|---|---|
|restarantId \| hotelId |String|Id of place - see getting id section|
|includeReviews|Boolean|If true result includes reviews for every place found|
| lastReviewDate |String|Date of last review that is included in results in format `YYYY-MM-DD`|

### 2. Output
The actor produces output as data you can get by section. 
# Getting Id of Restaurant or Hotel

 1. Visit the Place Page, e.g. `https://www.tripadvisor.cz/Hotel_Review-g186338-d1657415-Reviews-Park_Plaza_Westminster_Bridge_London-London_England.html`.
 2. The id is the number after `-d` in the url. For this url it would be `1657415`.

