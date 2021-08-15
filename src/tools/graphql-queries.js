const ReviewQuery = `query ReviewListQuery($locationId: Int!, $offset: Int, $limit: Int, $filters: [FilterConditionInput!], $prefs: ReviewListPrefsInput, $initialPrefs: ReviewListPrefsInput, $filterCacheKey: String, $prefsCacheKey: String, $keywordVariant: String!, $needKeywords: Boolean = true) {
  cachedFilters: personalCache(key: $filterCacheKey)
  cachedPrefs: personalCache(key: $prefsCacheKey)
  locations(locationIds: [$locationId]) {
    locationId
    parentGeoId
    name
    placeType
    reviewSummary {
      rating
      count
    }
    keywords(variant: $keywordVariant) @include(if: $needKeywords) {
      keywords {
        keyword
      }
    }
    ... on LocationInformation {
      parentGeoId
    }
    ... on LocationInformation {
      parentGeoId
    }
    ... on LocationInformation {
      name
      currentUserOwnerStatus {
        isValid
      }
    }
    ... on LocationInformation {
      locationId
      currentUserOwnerStatus {
        isValid
      }
    }
    ... on LocationInformation {
      locationId
      parentGeoId
      accommodationCategory
      currentUserOwnerStatus {
        isValid
      }
      url
    }
    reviewListPage(page: {offset: $offset, limit: $limit}, filters: $filters, prefs: $prefs, initialPrefs: $initialPrefs, filterCacheKey: $filterCacheKey, prefsCacheKey: $prefsCacheKey) {
      totalCount
      preferredReviewIds
      reviews {
        ... on Review {
          id
          url
          location {
            locationId
            name
          }
          createdDate
          publishedDate
          provider {
            isLocalProvider
          }
          userProfile {
            id
            userId: id
            isMe
            isVerified
            displayName
            username
            avatar {
              id
              photoSizes {
                url
                width
                height
              }
            }
            hometown {
              locationId
              fallbackString
              location {
                locationId
                additionalNames {
                  long
                }
                name
              }
            }
            contributionCounts {
              sumAllUgc
              helpfulVote
            }
            route {
              url
            }
          }
        }
        ... on Review {
          title
          language
          url
        }
        ... on Review {
          language
          translationType
        }
        ... on Review {
          roomTip
        }
        ... on Review {
          tripInfo {
            stayDate
          }
          location {
            placeType
          }
        }
        ... on Review {
          additionalRatings {
            rating
            ratingLabel
          }
        }
        ... on Review {
          tripInfo {
            tripType
          }
        }
        ... on Review {
          language
          translationType
          mgmtResponse {
            id
            language
            translationType
          }
        }
        ... on Review {
          text
          publishedDate
          username
          connectionToSubject
          language
          mgmtResponse {
            id
            text
            language
            publishedDate
            username
            connectionToSubject
          }
        }
        ... on Review {
          id
          locationId
          title
          text
          rating
          absoluteUrl
          mcid
          translationType
          mtProviderId
          photos {
            id
            statuses
            photoSizes {
              url
              width
              height
            }
          }
          userProfile {
            id
            displayName
            username
          }
        }
        ... on Review {
          mgmtResponse {
            id
          }
          provider {
            isLocalProvider
          }
        }
        ... on Review {
          translationType
          location {
            locationId
            parentGeoId
          }
          provider {
            isLocalProvider
            isToolsProvider
          }
          original {
            id
            url
            locationId
            userId
            language
            submissionDomain
          }
        }
        ... on Review {
          locationId
          mcid
          attribution
        }
        ... on Review {
          __typename
          locationId
          helpfulVotes
          photoIds
          route {
            url
          }
          socialStatistics {
            followCount
            isFollowing
            isLiked
            isReposted
            isSaved
            likeCount
            repostCount
            tripCount
          }
          status
          userId
          userProfile {
            id
            displayName
            isFollowing
          }
          location {
            __typename
            locationId
            additionalNames {
              normal
              long
              longOnlyParent
              longParentAbbreviated
              longOnlyParentAbbreviated
              longParentStateAbbreviated
              longOnlyParentStateAbbreviated
              geo
              abbreviated
              abbreviatedRaw
              abbreviatedStateTerritory
              abbreviatedStateTerritoryRaw
            }
            parent {
              locationId
              additionalNames {
                normal
                long
                longOnlyParent
                longParentAbbreviated
                longOnlyParentAbbreviated
                longParentStateAbbreviated
                longOnlyParentStateAbbreviated
                geo
                abbreviated
                abbreviatedRaw
                abbreviatedStateTerritory
                abbreviatedStateTerritoryRaw
              }
            }
          }
        }
        ... on Review {
          text
          language
        }
        ... on Review {
          locationId
          absoluteUrl
          mcid
          translationType
          mtProviderId
          originalLanguage
          rating
        }
        ... on Review {
          id
          locationId
          title
          labels
          rating
          absoluteUrl
          mcid
          translationType
          mtProviderId
          alertStatus
        }
      }
    }
    reviewAggregations {
      ratingCounts
      languageCounts
      alertStatusCount
    }
  }
}
`;

const SearchQuery = `query TypeaheadQuery($request: Typeahead_RequestInput!) {
  Typeahead_autocomplete(request: $request) {
    resultsId
    partial
    results {
      __typename
      ...TypeAhead_LocationItemFields
      ...TypeAhead_UserProfileFields
      ...TypeAhead_QuerySuggestionFields
      ...TypeAhead_RescueResultFields
      ...TypeAhead_ListResultFields
    }
  }
}

fragment TypeAhead_LocationItemFields on Typeahead_LocationItem {
  documentId
  locationId
  details {
    ...TypeAheadLocationInformationFields
  }
}

fragment TypeAhead_UserProfileFields on Typeahead_UserProfileItem {
  documentId
  userId
  details {
    ...TypeAheadUserProfileFields
  }
}

fragment TypeAheadLocationInformationFields on LocationInformation {
  localizedName
  localizedAdditionalNames {
    longOnlyHierarchy
  }
  streetAddress {
    street1
  }
  locationV2 {
    placeType
    names {
      longOnlyHierarchyTypeaheadV2
    }
    vacationRentalsRoute {
      url
    }
  }
  url
  HOTELS_URL: hotelsUrl
  ATTRACTIONS_URL: attractionOverviewURL
  RESTAURANTS_URL: restaurantOverviewURL
  placeType
  latitude
  longitude
  isGeo
  thumbnail {
    photoSizeDynamic {
      maxWidth
      maxHeight
      urlTemplate
    }
  }
}

fragment TypeAheadUserProfileFields on MemberProfile {
  username
  displayName
  followerCount
  isVerified
  isFollowing
  avatar {
    photoSizeDynamic {
      maxWidth
      maxHeight
      urlTemplate
    }
  }
  route {
    url
  }
}

fragment TypeAhead_QuerySuggestionFields on Typeahead_QuerySuggestionItem {
  documentId
  text
  route {
    url
  }
  buCategory
  parentGeoDetails {
    names {
      longOnlyHierarchyTypeaheadV2
    }
  }
}

fragment TypeAhead_RescueResultFields on Typeahead_RescueResultItem {
  documentId
  text
}

fragment TypeAhead_ListResultFields on Typeahead_ListResultItem {
  documentId
  locationId
  listResultType
  FORUMListURL {
    url
  }
  details {
    localizedName
    localizedAdditionalNames {
      longOnlyHierarchy
    }
    locationV2 {
      placeType
      names {
        longOnlyHierarchyTypeaheadV2
      }
      vacationRentalsRoute {
        url
      }
    }
    HOTELListURL: hotelsUrl
    RESTAURANTListURL: restaurantOverviewURL
    ATTRACTIONListURL: attractionOverviewURL
    thumbnail {
      photoSizeDynamic {
        maxWidth
        maxHeight
        urlTemplate
      }
    }
  }
}
`;

const PriceQuery = `query BusinessAdvantageQuery($locationId: Int!, $deviceType: BaAggregation_DeviceType, $trafficSource: BaAggregation_TrafficSource, $commerceCountryId: Int!, $servletName: String!, $hotelTravelInfo: BaAggregation_HotelTravelInfoInput, $withContactLinks: Boolean!) {
  locations(locationIds: [$locationId]) {
    locationId
    businessAdvantageData(deviceType: $deviceType, trafficSource: $trafficSource, commerceCountryId: $commerceCountryId, servletName: $servletName, hotelTravelInfo: $hotelTravelInfo) {
      specialOffer {
        headingForTeaser
        specialOfferId
        specialOfferType
        lightboxClickUrl
      }
      contactLinks @include(if: $withContactLinks) {
        contactLinkType
        linkUrl @encode
      }
    }
  }
}
`;

module.exports = {
    // ReviewQuery,
    SearchQuery,
    // PriceQuery,
};
