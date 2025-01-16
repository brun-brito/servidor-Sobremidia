function analyzeLogs(logs) {
    const detailedReport = {
        mediaDetails: {},
        playerDetails: {},
        summary: {
            totalExhibitions: logs.length,
            totalMedia: new Set(logs.map(log => log.mediaId)).size,
            totalPlayers: new Set(logs.map(log => log.playerId)).size,
        }
    };

    logs.forEach(log => {
        // Agrupar por mediaId
        if (!detailedReport.mediaDetails[log.mediaId]) {
            detailedReport.mediaDetails[log.mediaId] = {
                totalExhibitions: 0,
                players: {},
            };
        }

        detailedReport.mediaDetails[log.mediaId].totalExhibitions += 1;

        if (!detailedReport.mediaDetails[log.mediaId].players[log.playerId]) {
            detailedReport.mediaDetails[log.mediaId].players[log.playerId] = [];
        }

        detailedReport.mediaDetails[log.mediaId].players[log.playerId].push({
            date: log.date,
            time: log.time,
            ip: log.ip,
            type: log.type,
        });

        // Agrupar por playerId
        if (!detailedReport.playerDetails[log.playerId]) {
            detailedReport.playerDetails[log.playerId] = {
                totalExhibitions: 0,
                media: {},
            };
        }

        detailedReport.playerDetails[log.playerId].totalExhibitions += 1;

        if (!detailedReport.playerDetails[log.playerId].media[log.mediaId]) {
            detailedReport.playerDetails[log.playerId].media[log.mediaId] = [];
        }

        detailedReport.playerDetails[log.playerId].media[log.mediaId].push({
            date: log.date,
            time: log.time,
            ip: log.ip,
            type: log.type,
        });
    });

    return detailedReport;
}

module.exports = analyzeLogs;
