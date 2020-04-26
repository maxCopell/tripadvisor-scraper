# TripAdvisor Scraper
Get data from TripAdvisor fast and easily. A scraper is now available for restaurants and hotels. It's suitable for such use cases as scraping TripAdvisor reviews, emails, addresses, awards and many more attributes of hotels and restaurants on TripAdvisor.

# Input - TripAdvisor Crawler
You can either enter the location and download the data from the dataset or send a synchronous request to the actor endpoint and crawl all the information about a single place (hotel, restaurant) in 15 seconds.

# Output - TripAdvisor Export
You can extract a variety of data about a single place as well as about a complete location, including some of the most essential information, such as `email`, `phone`, `price` and `reviews`. Data can be downloaded in various formats, such as `JSON`, `CSV`, `XML` and others. For more details, see the [Apify Docs](https://www.apify.com/docs).

**Here is an example of `JSON` output:**

```json
 {
    "id": "672866",
    "type": "HOTEL",
    "name": "Staybridge Suites London",
    "awards": [
        {
            "year": "2018",
            "name": "Certificate of Excellence 2018"
        },
        {
            "year": "2017",
            "name": "Certificate of Excellence 2017"
        },
        {
            "year": "2016",
            "name": "Certificate of Excellence 2016"
        },
        {
            "year": "2015",
            "name": "Certificate of Excellence 2015"
        },
        {
            "year": "2014",
            "name": "Certificate of Excellence 2014"
        },
        {
            "year": "2013",
            "name": "Certificate of Excellence 2013"
        },
        {
            "year": "2012",
            "name": "Certificate of Excellence 2012"
        },
        {
            "year": "2011",
            "name": "Certificate of Excellence 2011"
        }
    ],
    "rankingPosition": "13",
    "priceLevel": "$$",
    "category": "hotel",
    "rating": "4.5",
    "hotelClass": "3.0",
    "hotelClassAttribution": "Star rating provided by Expedia.",
    "phone": "+18778595095",
    "address": "824 Exeter Rd, London, Ontario N6E 1L5 Canada",
    "amenities": [
        "Free Internet",
        "Free Wifi",
        "Fitness center",
        "Kitchenette",
        "Business Center",
        "Suites",
        "Wheelchair access",
        "Pool",
        "Internet",
        "Free Parking",
        "Pets Allowed",
        "Wifi",
        "Public Wifi",
        "Breakfast included",
        "Dry Cleaning",
        "Meeting Rooms",
        "Non-Smoking Rooms",
        "Laundry Service",
        "Air Conditioning",
        "Family Rooms",
        "Multilingual Staff",
        "Self-Serve Laundry",
        "Accessible rooms",
        "Microwave",
        "Refrigerator in room",
        "Conference Facilities",
        "Non-Smoking Hotel",
        "Heated pool",
        "Flatscreen TV",
        "Breakfast Buffet",
        "Indoor pool",
        "Breakfast Available",
        "Parking",
        "Facilities for Disabled Guests",
        "Housekeeping",
        "Smoking rooms available",
        "Baggage Storage",
        "BBQ Facilities",
        "Express Check-in / Check-out",
        "Convenience Store",
        "English",
        "Fax / Photocopying",
        "French",
        "24-Hour Front Desk",
        "Newspaper",
        "Portuguese",
        "Spanish",
        "Vending Machine"
    ],
    "prices": [
        {
            "provider": "Hotels.com",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=HotelsCom2&src=35062223&geo=672866&from=HotelDateSearch_api&slot=1&matchID=1&oos=0&cnt=10&silo=6036&bucket=852471&nrank=1&crank=1&clt=D&ttype=DesktopMeta&tm=130320066&managed=true&capped=false&gosox=MufysTB-R25wuTfx3jb5nBKviYJMik4Rkw6kpHnuQ1lssYSQXNaaSAcKPQ_fIVZ_Gr992908wb16jIAKuDhBJ5JMR1I_a8sgznmJwmBAAEV9y1OYGebzThfrFWVPjYeVOX2SZ1zMxfxrx-nx_kUv5yi6gizYezJ0G90kZPJtPB8&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=1c26dd999bf8187665f8865c258dfbc6e&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=fc14dd5cfff74011b8d53d05d3d53d62&tp=meta_hac"
        },
        {
            "provider": "Booking.com",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=BookingCom&src=34398091&geo=672866&from=HotelDateSearch_api&slot=2&matchID=1&oos=0&cnt=10&silo=6208&bucket=892275&nrank=2&crank=2&clt=D&ttype=DesktopMeta&tm=130320066&managed=false&capped=false&gosox=NT-hurSE2i82x52FhPCRQU6U2aqsrjRTAzG_afg1OblqxfYWDcluUREkmAANuKVEBq10W2QlAF86IsUm5hy5MMd7cNuLFdGd_949UCanziFV992IVbALSt7InDMNK5zgRpZvEdKLdU7psgWkvLgLizZNNCkfnD53OKuFJTml7-wYqN88qPEdVXhICcwrX4Kr&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=10b22df0a343c609a8dfb9acb29e9de65&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=d6795eab0388417083b6772ff4620531&tp=meta_hac"
        },
        {
            "provider": "Expedia.com",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=Expedia&src=32708555&geo=672866&from=HotelDateSearch_api&slot=3&matchID=1&oos=0&cnt=10&silo=5621&bucket=850322&nrank=3&crank=3&clt=D&ttype=DesktopMeta&tm=130320066&managed=true&capped=false&gosox=srVNQGoQ5BIVms7GkGUZCPedkKhFc8YyjH3VCyEhZh9H9SftRoZpDOvz5-yyA3VniAvtxFuMEApijePWGDDCbgXYIq7ExCmIQFa0clDv0WxAR2jh2gX_UohQuJ8c1JLTEEKKgvMwoYZrIS9Pza9yPwdOUaTeO4UbWVj93NlclL8&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=1c7100d0337ef66a191bb1790d92218e2&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=5caf26ac491c463981dbba7832e268b2&tp=meta_hac"
        },
        {
            "provider": "Staybridge.com",
            "price": "91",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=IHG&src=40794971&geo=672866&from=HotelDateSearch_api&slot=4&matchID=1&oos=0&cnt=10&silo=7269&bucket=902709&nrank=4&crank=4&clt=D&ttype=DesktopMeta&tm=130320066&managed=false&capped=false&gosox=CqirHZ5IRfcZ-qne9IaWbimW_2uruboIcKhN--kLBnVujO-F-H-2PY8yrXnOyMnPRiz9zlsf2fPHOUhIfxRcN8AP1IauKOxABPjbzomB2lFyhnRg0vQPaNRTOpAGJ9rcr2wD3yTNtEC3cve-QQRLDt-UsilRGvSHksAad1nliEvYGFKGw_EdD4mD6lYEBAbt_PPnqGkxZv1uKE8uBXfbDliLAPKF5Xp8riAl5MkmnjY&priceShown=91&hac=AVAILABLE&mbl=BEAT&mbldelta=0&rate=90.59&fees=15.87&cur=USD&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=1170638232be5be29eed412d7d4c3b00e&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=a27f9f4ad41746c1b34a4ae933b20ac0&tp=meta_hac"
        },
        {
            "provider": "Orbitz.com",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=OrbitzEWS&src=78908133&geo=672866&from=HotelDateSearch_api&slot=5&matchID=1&oos=0&cnt=10&silo=20426&bucket=856023&nrank=6&crank=5&clt=D&ttype=DesktopMeta&tm=130320066&managed=true&capped=false&gosox=WAEnaIm3XZerv1kKXfL_qCzcXtFa7Dtuu-qoyRzx2u300xINNqHuZYD_xw77AmW5WxjCKEOXlngaowYXEp5e290TbwGaDIW8k4o3fhYKkZzcSaTDGPNcBOEy2APvvxauef-99ZsKZ1boi790hr9nFiL-qlR2VVIusPyj-S87vAs&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=106550175937a50b33593670c6196a576&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=b78fd026343249e8b8d1a91f59e359c2&tp=meta_hac"
        },
        {
            "provider": "Agoda.com",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=Agoda&src=35835215&geo=672866&from=HotelDateSearch_api&slot=6&matchID=1&oos=0&cnt=10&silo=6414&bucket=895084&nrank=5&crank=6&clt=D&ttype=DesktopMeta&tm=130320066&managed=false&capped=false&gosox=sxibuF7CP5CXu_QydqP_TMLAX9W9PleZyIAR9sRE54xu1cpvxeTc1iwwCG6TdyzPYmadIlLKqtDrSK_2glylRNu_MPXBkaHom_QptO2A0IZUHP7LH-jlkqdV_eRe4BP1mO-n9qP6LZe9M6p6CGPS9fV4RMPdMjfnFGLSoRZLE8E&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=15af4cda469bddc8f1caa323ccbc7c15a&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=2be5c060d37249dea37083e2ca9aa7ad&tp=meta_hac"
        },
        {
            "provider": "Travelocity",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=TravelocityEWS&src=53947708&geo=672866&from=HotelDateSearch_api&slot=7&matchID=1&oos=0&cnt=10&silo=11450&bucket=855746&nrank=6&crank=7&clt=D&ttype=DesktopMeta&tm=130320066&managed=true&capped=false&gosox=WAEnaIm3XZerv1kKXfL_qNhNCxbyV5AUGwGE_Xl2rciQ6z9XDBZeVyEKGvyVoglMlxwcz5pqr_279XLNEQRsJp3zl4RIa50HwVPcojmYlYT53ckwz1HuynEq-Pl80yIPVhVTRhEGKT46LPhrpdrYhg&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=1b9b411d1a23e2fe9fb1f159bab99341a&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=955ae9e2778f463787360a8882ad3fdf&tp=meta_hac"
        },
        {
            "provider": "ZenHotels.com",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=ZenHotels&src=106110254&geo=672866&from=HotelDateSearch_api&slot=8&matchID=1&oos=0&cnt=10&silo=33011&bucket=891571&nrank=8&crank=8&clt=D&ttype=DesktopMeta&tm=130320066&managed=true&capped=false&gosox=A3P1mIdM3dEZOoOzqLbm1c2BsywDRpv3wbvYjI1_vCGfR6xM_-RXamyImBb1WqVcAdxm4CY_LRj6Q1m3XgkZRSOkW0Vr2T2HnHSLIZQsJWz53ckwz1HuynEq-Pl80yIPVhVTRhEGKT46LPhrpdrYhg&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=17feb4523c3dbaeb00193ceaef07e3c03&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=b853c0cf066b4f5aa2ee687f0c69e6c0&tp=meta_hac"
        },
        {
            "provider": "Priceline",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=Priceline&src=38608736&geo=672866&from=HotelDateSearch_api&slot=9&matchID=1&oos=0&cnt=10&silo=17376&bucket=855815&nrank=9&crank=9&clt=D&ttype=DesktopMeta&tm=130320066&managed=true&capped=false&gosox=YyOngmNEqhxZ_JSWu9Ud5bGLteRs47v6-Q5DNcOcO0klblir4t7bOp2OHjylhUWqngJ3menxIfxxMeNyAXAlboTIqbE0mYqhV6ENqX-KtZX53ckwz1HuynEq-Pl80yIPVhVTRhEGKT46LPhrpdrYhg&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=13f14907b1bf1dcd9c57ba1b0143549c5&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=d39ee811bea64984a23cdf8e3eed7b91&tp=meta_hac"
        },
        {
            "provider": "Hotwire.com",
            "price": "NOT_PROVIDED",
            "isBookable": false,
            "link": "https://www.tripadvisor.com/Commerce?p=Hotwire&src=65711793&geo=672866&from=HotelDateSearch_api&slot=10&matchID=1&oos=0&cnt=10&silo=15790&bucket=872448&nrank=9&crank=10&clt=D&ttype=DesktopMeta&tm=130320066&managed=true&capped=false&gosox=YyOngmNEqhxZ_JSWu9Ud5WT8Sb-ZNqlN7bCZQwIXwl0lblir4t7bOp2OHjylhUWqE3OgZg5BfRiKt1FK_O5IwH3LU5gZ5vNOF-sVZU-Nh5U5fZJnXMzF_GvH6fH-RS_nKLqCLNh7MnQb3SRk8m08Hw&hac=INITIALIZED&adults=2&child_rm_ages=&inDay=17&outDay=18&rooms=1&inMonth=2&inYear=2019&outMonth=2&outYear=2019&auid=68d7888d-6b1e-4ece-a0ad-aa926652e9b6&def_d=false&bld=L_1,D_0,G_2,W_7,U_0,C_190217&bh=true&cs=170ce52556dd1d7ca25b459e6f72e89d9&area=QC_META_API&mcid=13091&ik=eb0d81a98f2a4c39955c4f95e71dfed7&drv=-1&dated=true&aok=d36f1bfa7d94482091dfabdac994aa04&tp=meta_hac"
        }
    ],
    "reviews": [
        {
            "text": "We traveled to London for a sledge tournament, we had a two bedroom suite for me and 4 children was perfect more then enough space for wheelchair and our equipment, complementary breakfast kids enjoyed very much I loved having the kitchen for all other meals in room \nWas like a mini home, the pool was on the small side but we where only ones using it so worked out well \nWe will be back next year for our 3rd stay ",
            "title": "Great space ",
            "rating": 4,
            "stayDate": "2019-01-31",
            "publishedDate": "2019-02-09",
            "userLocation": "Ontario, Canada",
            "userContributions": 25
        }
    ]
}
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

### TripAdvisor scraping tutorial
If you need help or want to follow the scraping of TripAdvisor step by step, be sure to check our blogpost [How to Scrape TripAdvisor](https://medium.com/@petrpatekml/c910f75153a9).
