// const ReviewQuery = `query ReviewListQuery($locationId: Int!, $offset: Int, $limit: Int, $filters: [FilterConditionInput!], $prefs: ReviewListPrefsInput, $initialPrefs: ReviewListPrefsInput, $filterCacheKey: String, $prefsCacheKey: String, $keywordVariant: String!, $needKeywords: Boolean = true) {
//   cachedFilters: personalCache(key: $filterCacheKey)
//   cachedPrefs: personalCache(key: $prefsCacheKey)
//   locations(locationIds: [$locationId]) {
//     locationId
//     parentGeoId
//     name
//     placeType
//     reviewSummary {
//       rating
//       count
//     }
//     keywords(variant: $keywordVariant) @include(if: $needKeywords) {
//       keywords {
//         keyword
//       }
//     }
//     ... on LocationInformation {
//       parentGeoId
//     }
//     ... on LocationInformation {
//       parentGeoId
//     }
//     ... on LocationInformation {
//       name
//       currentUserOwnerStatus {
//         isValid
//       }
//     }
//     ... on LocationInformation {
//       locationId
//       currentUserOwnerStatus {
//         isValid
//       }
//     }
//     ... on LocationInformation {
//       locationId
//       parentGeoId
//       accommodationCategory
//       currentUserOwnerStatus {
//         isValid
//       }
//       url
//     }
//     reviewListPage(page: {offset: $offset, limit: $limit}, filters: $filters, prefs: $prefs, initialPrefs: $initialPrefs, filterCacheKey: $filterCacheKey, prefsCacheKey: $prefsCacheKey) {
//       totalCount
//       preferredReviewIds
//       reviews {
//         ... on Review {
//           id
//           url
//           location {
//             locationId
//             name
//           }
//           createdDate
//           publishedDate
//           provider {
//             isLocalProvider
//           }
//           userProfile {
//             id
//             userId: id
//             isMe
//             isVerified
//             displayName
//             username
//             avatar {
//               id
//               photoSizes {
//                 url
//                 width
//                 height
//               }
//             }
//             hometown {
//               locationId
//               fallbackString
//               location {
//                 locationId
//                 additionalNames {
//                   long
//                 }
//                 name
//               }
//             }
//             contributionCounts {
//               sumAllUgc
//               helpfulVote
//             }
//             route {
//               url
//             }
//           }
//         }
//         ... on Review {
//           title
//           language
//           url
//         }
//         ... on Review {
//           language
//           translationType
//         }
//         ... on Review {
//           roomTip
//         }
//         ... on Review {
//           tripInfo {
//             stayDate
//           }
//           location {
//             placeType
//           }
//         }
//         ... on Review {
//           additionalRatings {
//             rating
//             ratingLabel
//           }
//         }
//         ... on Review {
//           tripInfo {
//             tripType
//           }
//         }
//         ... on Review {
//           language
//           translationType
//           mgmtResponse {
//             id
//             language
//             translationType
//           }
//         }
//         ... on Review {
//           text
//           publishedDate
//           username
//           connectionToSubject
//           language
//           mgmtResponse {
//             id
//             text
//             language
//             publishedDate
//             username
//             connectionToSubject
//           }
//         }
//         ... on Review {
//           id
//           locationId
//           title
//           text
//           rating
//           absoluteUrl
//           mcid
//           translationType
//           mtProviderId
//           photos {
//             id
//             statuses
//             photoSizes {
//               url
//               width
//               height
//             }
//           }
//           userProfile {
//             id
//             displayName
//             username
//           }
//         }
//         ... on Review {
//           mgmtResponse {
//             id
//           }
//           provider {
//             isLocalProvider
//           }
//         }
//         ... on Review {
//           translationType
//           location {
//             locationId
//             parentGeoId
//           }
//           provider {
//             isLocalProvider
//             isToolsProvider
//           }
//           original {
//             id
//             url
//             locationId
//             userId
//             language
//             submissionDomain
//           }
//         }
//         ... on Review {
//           locationId
//           mcid
//           attribution
//         }
//         ... on Review {
//           __typename
//           locationId
//           helpfulVotes
//           photoIds
//           route {
//             url
//           }
//           socialStatistics {
//             followCount
//             isFollowing
//             isLiked
//             isReposted
//             isSaved
//             likeCount
//             repostCount
//             tripCount
//           }
//           status
//           userId
//           userProfile {
//             id
//             displayName
//             isFollowing
//           }
//           location {
//             __typename
//             locationId
//             additionalNames {
//               normal
//               long
//               longOnlyParent
//               longParentAbbreviated
//               longOnlyParentAbbreviated
//               longParentStateAbbreviated
//               longOnlyParentStateAbbreviated
//               geo
//               abbreviated
//               abbreviatedRaw
//               abbreviatedStateTerritory
//               abbreviatedStateTerritoryRaw
//             }
//             parent {
//               locationId
//               additionalNames {
//                 normal
//                 long
//                 longOnlyParent
//                 longParentAbbreviated
//                 longOnlyParentAbbreviated
//                 longParentStateAbbreviated
//                 longOnlyParentStateAbbreviated
//                 geo
//                 abbreviated
//                 abbreviatedRaw
//                 abbreviatedStateTerritory
//                 abbreviatedStateTerritoryRaw
//               }
//             }
//           }
//         }
//         ... on Review {
//           text
//           language
//         }
//         ... on Review {
//           locationId
//           absoluteUrl
//           mcid
//           translationType
//           mtProviderId
//           originalLanguage
//           rating
//         }
//         ... on Review {
//           id
//           locationId
//           title
//           labels
//           rating
//           absoluteUrl
//           mcid
//           translationType
//           mtProviderId
//           alertStatus
//         }
//       }
//     }
//     reviewAggregations {
//       ratingCounts
//       languageCounts
//       alertStatusCount
//     }
//   }
// }
// `;

// Pre-registered query has to be used
const SearchQuery = 'c9d791589f937ec371723f236edc7c6b';

module.exports = {
    // ReviewQuery,
    SearchQuery,
    // PriceQuery,
};
