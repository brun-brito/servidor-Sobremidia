function analyzeLogs(logs) {
    const mediaCount = {};
    const panelCount = {};
    const dateCount = {};

    logs.forEach(log => {
        const { date, playerId, mediaId } = log;

        mediaCount[mediaId] = (mediaCount[mediaId] || 0) + 1;
        panelCount[playerId] = (panelCount[playerId] || 0) + 1;
        dateCount[date] = (dateCount[date] || 0) + 1;
    });

    return { mediaCount, panelCount, dateCount };
}

module.exports = analyzeLogs;
