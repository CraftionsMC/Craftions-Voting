# Craftions-Voting
Voting Page for craftions.net

## API
---
The api is accessible under /api/vote.
It uses query-strings to get data.

The query-string `action` is needed always to tell the server what to do.

**Its value can be these:**
| Value  | Description             |
|--------|-------------------------|
| VOTE   | Submit a voting request |
| CREATE | Create a poll           |
| DELETE | Delete an existing poll |

### **Vote request**
---
**Query-strings:**
| ID     | Type | Description         |
|--------|------|---------------------|
| id     | uint | The id of the poll  |
| choice | uint | The selected choice |

**Return-values:**
| Name                  | Code | Description                  |
|-----------------------|------|------------------------------|
| OK                    | 200  | Successfully voted           |
| Bad Request           | 400  | The data given is faulty     |
| Not Found             | 404  | The poll was not found       |
| Conflict              | 409  | The poll already ended       |
| Internal Server Error | 500  | An serverside error occurred |

### **Create request**
---
**Query-strings:**
| ID       | Type                      | Description           |
|----------|---------------------------|-----------------------|
| username | string                    | The account username  |
| token    | string                    | The account token     |
| data     | URIcomponent-encoded JSON | The data for the poll |

**Query-strings/data JSON object data:**
| Key           | Type   | Description                                                 |
|---------------|--------|-------------------------------------------------------------|
| name          | string | The name of the poll                                        |
| description   | string | The description of the poll                                 |
| choices       | JSON   | The choice of the poll                                      |
| seePercentage | bool   | Whether the user is able to see the amount of votes or not  |
| changeVote    | bool   | Whether the user is able to change its decision             |
| time          | uint   | The time in minutes until the poll ends (< 40321 | 4 Weeks) |

**Query-strings/data/choices JSON object data:**
| Key           | Type    | Description                   |
|---------------|---------|-------------------------------|
| name          | string  | The name of the choice        |
| description   | string? | The description of the choice |

**Return-values:**
| Name                  | Code | Description                  |
|-----------------------|------|------------------------------|
| OK                    | 200  | Successfully created poll    |
| Bad Request           | 400  | The data given is faulty     |
| Forbidden             | 403  | The authentication failed    |
| Internal Server Error | 500  | An serverside error occurred |

### **Delete request**
---
**Query-strings:**
| ID       | Type   | Description          |
|----------|--------|----------------------|
| username | string | The account username |
| token    | string | The account token    |
| id       | uint   | The ID of the poll   |

**Return-values:**
| Name                  | Code | Description                  |
|-----------------------|------|------------------------------|
| OK                    | 200  | Successfully deleted poll    |
| Bad Request           | 400  | The data given is faulty     |
| Forbidden             | 403  | The authentication failed    |
| Not Found             | 404  | The poll was not found       |
| Internal Server Error | 500  | An serverside error occurred |
