## What can this unofficial Tripadvisor API do?
This scraper lets you get data from Tripadvisor fast and easily. It's suitable for such use cases as scraping Tripadvisor reviews, emails, addresses, awards, and many more attributes of hotels and restaurants on the Tripadvisor platform.

You can either enter the location and download the data from the dataset or send a synchronous request to the actor endpoint and crawl all the information about a single place (e.g., hotel, restaurant) in 15 seconds.

## How do I use Tripadvisor Scraper?
You can either use search term (location), or use specific ids (place, restaurant, or hotel id)

If you use  _search_, you can state how many items you want to get in the  _maximum items_  field, then what content you want to get (attractions, restaurants, hotels). If you are scraping hotels you can also choose check-in dates).

Alternatively, you can scrape review tags from specified places as well as reviews from specific dates (you can set a limit on the number of reviews you want to scrape). You can also select languages and currencies.

## How much does Tripadvisor Scraper cost?
It will cost you approx. USD 0.50 to scrape 1,000 items. The more results you want to scrape, the more time it will take and the more usage credits it will cost.

Apify provides you with USD 5 free usage credits to use every month on the Apify Free plan so you can get up to 10,000 reviews from Tripadvisor Scraper for those credits. So 10k results will be completely free!

But if you need to get more data or to get your data regularly you should grab an Apify subscription. We recommend our $49/month Personal plan - you could get up to 100,000 Tripadvisor reviews every month with the $49 monthly plan!

## Tips for API Usage
If you want to get information about a single hotel or restaurant and you don't want it in a single synchronous API call, the API is right for you.

Be aware that it might be impossible to maintain an idle HTTP connection for a long period of time, due to client timeout or network conditions. Make sure your HTTP client is configured to have a long enough connection timeout. If the connection breaks, you will not receive any information about the run and its status. However for a normal location with a reasonable number of reviews (~1000) it should not take more than 20 seconds. You can  _paginate_  the reviews using  `lastReviewDate`  property.

Here is a link to the part of  [Apify docs](https://www.apify.com/docs/api/v2#/reference/actors/run-actor-synchronously/with-input)  that covers running an actor synchronously.
