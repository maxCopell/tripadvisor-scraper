const ReviewQuery =`query ReviewListQuery($locationId: Int!, $offset: Int, $limit: Int, $filters: [FilterConditionInput!], $prefs: ReviewListPrefsInput, $initialPrefs: ReviewListPrefsInput, $filterCacheKey: String, $prefsCacheKey: String, $keywordVariant: String!, $needKeywords: Boolean = true, $ownerPreferredReviewId: Int){
        cachedFilters: personalCache(key: $filterCacheKey)
        cachedPrefs: personalCache(key: $prefsCacheKey)
        locations(locationIds: [$locationId]) {
            locationId
            parentGeoId
            name
            reviewSummary {
                rating
                count
                __typename
            }
            keywords(variant: $keywordVariant) @include(if: $needKeywords) {
                keywords {
                    keyword
                    __typename
                }
                __typename
            }
        ... on LocationInformation {
                parentGeoId
                __typename
            }
        ... on LocationInformation {
                parentGeoId
                __typename
            }
        ... on LocationInformation {
                name
                __typename
            }
        ... on LocationInformation {
                locationId
                parentGeoId
                accommodationCategory
                currentUserOwnerStatus {
                    isValid
                    __typename
                }
                __typename
            }
            reviewList(page: {offset: $offset, limit: $limit}, filters: $filters, prefs: $prefs, initialPrefs: $initialPrefs, filterCacheKey: $filterCacheKey, prefsCacheKey: $prefsCacheKey, ownerPreferredReviewId: $ownerPreferredReviewId) {
                totalCount
                ratingCounts
                languageCounts
                preferredReviewIds
                reviews {
                ... on Review {
                        id
                        url
                        location {
                            locationId
                            name
                            __typename
                        }
                        createdDate
                        publishedDate
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
                                    __typename
                                }
                                __typename
                            }
                            route {
                                url
                                __typename
                            }
                            contributionCounts{
                                sumReview
                            }
                            hometown {
                                locationId
                                fallbackString
                                location {
                                    locationId
                                    name
                                    additionalNames {
                                        long
                                        __typename
                                    }
                                    parent {
                                        locationId
                                        name
                                        __typename
                                    }
                                    __typename
                                }
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                ... on Review {
                        rating
                        publishedDate
                        publishPlatform
                        __typename
                    }
                ... on Review {
                        title
                        language
                        url
                        __typename
                    }
                ... on Review {
                        language
                        translationType
                        __typename
                    }
                ... on Review {
                        roomTip
                        __typename
                    }
                ... on Review {
                        tripInfo {
                            stayDate
                            __typename
                        }
                        location {
                            placeType
                            __typename
                        }
                        __typename
                    }
                ... on Review {
                        additionalRatings {
                            rating
                            ratingLabel
                            __typename
                        }
                        __typename
                    }
                ... on Review {
                        tripInfo {
                            tripType
                            __typename
                        }
                        __typename
                    }
                ... on Review {
                        language
                        translationType
                        mgmtResponse {
                            id
                            language
                            translationType
                            __typename
                        }
                        __typename
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
                            __typename
                        }
                        __typename
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
                            photoSizes {
                                url
                                width
                                height
                                __typename
                            }
                            __typename
                        }
                        userProfile {
                            id
                            displayName
                            username
                            __typename
                        }
                        __typename
                    }
                ... on Review {
                        mgmtResponse {
                            id
                            __typename
                        }
                        provider {
                            isLocalProvider
                            __typename
                        }
                        __typename
                    }
                ... on Review {
                        translationType
                        location {
                            locationId
                            parentGeoId
                            __typename
                        }
                        provider {
                            isLocalProvider
                            isToolsProvider
                            __typename
                        }
                        original {
                            id
                            url
                            locationId
                            userId
                            language
                            submissionDomain
                            __typename
                        }
                        __typename
                    }
                ... on Review {
                        locationId
                        mcid
                        attribution
                        __typename
                    }
                ... on Review {
                        locationId
                        helpfulVotes
                        photoIds
                        route {
                            url
                            __typename
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
                            __typename
                        }
                        status
                        userId
                        userProfile {
                            id
                            displayName
                            __typename
                        }
                        location {
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
                                __typename
                            }
                            parent {
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
                                    __typename
                                }
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                ... on Review {
                        text
                        language
                        __typename
                    }
                ... on Review {
                        locationId
                        absoluteUrl
                        mcid
                        translationType
                        mtProviderId
                        originalLanguage
                        rating
                        __typename
                    }
                ... on Review {
                        id
                        locationId
                        title
                        rating
                        absoluteUrl
                        mcid
                        translationType
                        mtProviderId
                        __typename
                    }
                    __typename
                }
                __typename
            }
            __typename
        }
    }
`;

module.exports = {
    ReviewQuery
};
