const axios = require("axios");

async function getLiveFixtures() {
    // const url = "https://v3.football.api-sports.io/fixtures?live=all";
    const url = "https://v3.football.api-sports.io/fixtures?league=71&live=all";
    const headers = {
        "x-rapidapi-key": "b6312782bb758141f1fdadf4d6067c3c"
    };
    const response = await axios.get(url, { headers });
    return response.data;
    // return (
    //     {
    //         "response": [
    //       {
    //         "fixture": {
    //             "id": 1351204,
    //             "referee": "Rodrigo Jose Pereira de Lima, Brazil",
    //             "timezone": "UTC",
    //             "date": "2025-07-26T21:30:00+00:00",
    //             "timestamp": 1753565400,
    //             "periods": {
    //                 "first": 1753565400,
    //                 "second": null
    //             },
    //             "venue": {
    //                 "id": null,
    //                 "name": "Estádio Olímpico Nilton Santos",
    //                 "city": "Rio de Janeiro"
    //             },
    //             "status": {
    //                 "long": "First Half",
    //                 "short": "1H",
    //                 "elapsed": 7,
    //                 "extra": null
    //             }
    //         },
    //         "league": {
    //             "id": 71,
    //             "name": "Serie A",
    //             "country": "Brazil",
    //             "logo": "https://media.api-sports.io/football/leagues/71.png",
    //             "flag": "https://media.api-sports.io/flags/br.svg",
    //             "season": 2025,
    //             "round": "Regular Season - 17",
    //             "standings": true
    //         },
    //         "teams": {
    //             "home": {
    //                 "id": 120,
    //                 "name": "Botafogo",
    //                 "logo": "https://media.api-sports.io/football/teams/120.png",
    //                 "winner": null
    //             },
    //             "away": {
    //                 "id": 131,
    //                 "name": "Corinthians",
    //                 "logo": "https://media.api-sports.io/football/teams/131.png",
    //                 "winner": null
    //             }
    //         },
    //         "goals": {
    //             "home": 0,
    //             "away": 0
    //         },
    //         "score": {
    //             "halftime": {
    //                 "home": 0,
    //                 "away": 0
    //             },
    //             "fulltime": {
    //                 "home": null,
    //                 "away": null
    //             },
    //             "extratime": {
    //                 "home": null,
    //                 "away": null
    //             },
    //             "penalty": {
    //                 "home": null,
    //                 "away": null
    //             }
    //         },
    //         "events": []
    //     },
    //     {
    //         "fixture": {
    //             "id": 1351207,
    //             "referee": "Bruno Arleu de Araujo, Brazil",
    //             "timezone": "UTC",
    //             "date": "2025-07-26T21:30:00+00:00",
    //             "timestamp": 1753565400,
    //             "periods": {
    //                 "first": 1753565400,
    //                 "second": null
    //             },
    //             "venue": {
    //                 "id": 5676,
    //                 "name": "Estádio José Maria de Campos Maia",
    //                 "city": "Mirassol, São Paulo"
    //             },
    //             "status": {
    //                 "long": "First Half",
    //                 "short": "1H",
    //                 "elapsed": 7,
    //                 "extra": null
    //             }
    //         },
    //         "league": {
    //             "id": 71,
    //             "name": "Serie A",
    //             "country": "Brazil",
    //             "logo": "https://media.api-sports.io/football/leagues/71.png",
    //             "flag": "https://media.api-sports.io/flags/br.svg",
    //             "season": 2025,
    //             "round": "Regular Season - 17",
    //             "standings": true
    //         },
    //         "teams": {
    //             "home": {
    //                 "id": 7848,
    //                 "name": "Mirassol",
    //                 "logo": "https://media.api-sports.io/football/teams/7848.png",
    //                 "winner": true
    //             },
    //             "away": {
    //                 "id": 136,
    //                 "name": "Vitoria",
    //                 "logo": "https://media.api-sports.io/football/teams/136.png",
    //                 "winner": false
    //             }
    //         },
    //         "goals": {
    //             "home": 1,
    //             "away": 0
    //         },
    //         "score": {
    //             "halftime": {
    //                 "home": 1,
    //                 "away": 0
    //             },
    //             "fulltime": {
    //                 "home": null,
    //                 "away": null
    //             },
    //             "extratime": {
    //                 "home": null,
    //                 "away": null
    //             },
    //             "penalty": {
    //                 "home": null,
    //                 "away": null
    //             }
    //         },
    //         "events": [
    //             {
    //                 "time": {
    //                     "elapsed": 6,
    //                     "extra": null
    //                 },
    //                 "team": {
    //                     "id": 7848,
    //                     "name": "Mirassol",
    //                     "logo": "https://media.api-sports.io/football/teams/7848.png"
    //                 },
    //                 "player": {
    //                     "id": 54238,
    //                     "name": "Edson Carioca"
    //                 },
    //                 "assist": {
    //                     "id": null,
    //                     "name": null
    //                 },
    //                 "type": "Goal",
    //                 "detail": "Normal Goal",
    //                 "comments": null
    //             }
    //         ]
    //     },
    //     {
    //         "fixture": {
    //             "id": 1351211,
    //             "referee": "Wagner do Nascimento Magalhaes, Brazil",
    //             "timezone": "UTC",
    //             "date": "2025-07-26T21:30:00+00:00",
    //             "timestamp": 1753565400,
    //             "periods": {
    //                 "first": 1753565400,
    //                 "second": null
    //             },
    //             "venue": {
    //                 "id": 225,
    //                 "name": "Estádio Governador Plácido Aderaldo Castelo",
    //                 "city": "Fortaleza, Ceará"
    //             },
    //             "status": {
    //                 "long": "First Half",
    //                 "short": "1H",
    //                 "elapsed": 6,
    //                 "extra": null
    //             }
    //         },
    //         "league": {
    //             "id": 71,
    //             "name": "Serie A",
    //             "country": "Brazil",
    //             "logo": "https://media.api-sports.io/football/leagues/71.png",
    //             "flag": "https://media.api-sports.io/flags/br.svg",
    //             "season": 2025,
    //             "round": "Regular Season - 17",
    //             "standings": true
    //         },
    //         "teams": {
    //             "home": {
    //                 "id": 154,
    //                 "name": "Fortaleza EC",
    //                 "logo": "https://media.api-sports.io/football/teams/154.png",
    //                 "winner": true
    //             },
    //             "away": {
    //                 "id": 794,
    //                 "name": "RB Bragantino",
    //                 "logo": "https://media.api-sports.io/football/teams/794.png",
    //                 "winner": false
    //             }
    //         },
    //         "goals": {
    //             "home": 1,
    //             "away": 0
    //         },
    //         "score": {
    //             "halftime": {
    //                 "home": 1,
    //                 "away": 0
    //             },
    //             "fulltime": {
    //                 "home": null,
    //                 "away": null
    //             },
    //             "extratime": {
    //                 "home": null,
    //                 "away": null
    //             },
    //             "penalty": {
    //                 "home": null,
    //                 "away": null
    //             }
    //         },
    //         "events": [
    //             {
    //                 "time": {
    //                     "elapsed": 4,
    //                     "extra": null
    //                 },
    //                 "team": {
    //                     "id": 154,
    //                     "name": "Fortaleza EC",
    //                     "logo": "https://media.api-sports.io/football/teams/154.png"
    //                 },
    //                 "player": {
    //                     "id": 9934,
    //                     "name": "Deyverson"
    //                 },
    //                 "assist": {
    //                     "id": null,
    //                     "name": null
    //                 },
    //                 "type": "Goal",
    //                 "detail": "Normal Goal",
    //                 "comments": null
    //             }
    //         ]
    //     },
    //     {
    //         "fixture": {
    //             "id": 1351212,
    //             "referee": "Rafael Rodrigo Klein, Brazil",
    //             "timezone": "UTC",
    //             "date": "2025-07-26T21:30:00+00:00",
    //             "timestamp": 1753565400,
    //             "periods": {
    //                 "first": 1753565400,
    //                 "second": null
    //             },
    //             "venue": {
    //                 "id": 276,
    //                 "name": "Estádio Adelmar da Costa Carvalho",
    //                 "city": "Recife, Pernambuco"
    //             },
    //             "status": {
    //                 "long": "First Half",
    //                 "short": "1H",
    //                 "elapsed": 8,
    //                 "extra": null
    //             }
    //         },
    //         "league": {
    //             "id": 71,
    //             "name": "Serie A",
    //             "country": "Brazil",
    //             "logo": "https://media.api-sports.io/football/leagues/71.png",
    //             "flag": "https://media.api-sports.io/flags/br.svg",
    //             "season": 2025,
    //             "round": "Regular Season - 17",
    //             "standings": true
    //         },
    //         "teams": {
    //             "home": {
    //                 "id": 123,
    //                 "name": "Sport Recife",
    //                 "logo": "https://media.api-sports.io/football/teams/123.png",
    //                 "winner": true
    //             },
    //             "away": {
    //                 "id": 128,
    //                 "name": "Santos",
    //                 "logo": "https://media.api-sports.io/football/teams/128.png",
    //                 "winner": false
    //             }
    //         },
    //         "goals": {
    //             "home": 1,
    //             "away": 0
    //         },
    //         "score": {
    //             "halftime": {
    //                 "home": 1,
    //                 "away": 0
    //             },
    //             "fulltime": {
    //                 "home": null,
    //                 "away": null
    //             },
    //             "extratime": {
    //                 "home": null,
    //                 "away": null
    //             },
    //             "penalty": {
    //                 "home": null,
    //                 "away": null
    //             }
    //         },
    //         "events": [
    //             {
    //                 "time": {
    //                     "elapsed": 4,
    //                     "extra": null
    //                 },
    //                 "team": {
    //                     "id": 123,
    //                     "name": "Sport Recife",
    //                     "logo": "https://media.api-sports.io/football/teams/123.png"
    //                 },
    //                 "player": {
    //                     "id": 145501,
    //                     "name": "Derik Lacerda"
    //                 },
    //                 "assist": {
    //                     "id": 237706,
    //                     "name": "Chrystian Barletta"
    //                 },
    //                 "type": "Goal",
    //                 "detail": "Normal Goal",
    //                 "comments": null
    //             }
    //         ]
    //     }
    //       ]
    //     }
    // )
}

module.exports = { getLiveFixtures };
