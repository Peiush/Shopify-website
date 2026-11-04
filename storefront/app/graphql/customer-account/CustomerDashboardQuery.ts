import {ORDER_ITEM_FRAGMENT} from '~/graphql/customer-account/CustomerOrdersQuery';

// NOTE: https://shopify.dev/docs/api/customer/latest/queries/customer
export const CUSTOMER_DASHBOARD_QUERY = `#graphql
  query CustomerDashboard($language: LanguageCode)
  @inContext(language: $language) {
    customer {
      id
      firstName
      lastName
      creationDate
      emailAddress {
        emailAddress
      }
      defaultAddress {
        id
        formatted
        city
        zoneCode
        territoryCode
      }
      addresses(first: 20) {
        nodes {
          id
        }
      }
      orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          ...OrderItem
          lineItems(first: 3) {
            nodes {
              title
              quantity
              image {
                url
                altText
                width
                height
              }
            }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
  ${ORDER_ITEM_FRAGMENT}
` as const;
