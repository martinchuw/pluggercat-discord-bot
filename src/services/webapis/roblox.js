/*

    A wrapper for Roblox external APIs, most of them will need an
    account Cookie, but for now we'll only add APIs that
    don't need an account cookie.

*/
const axios = require("axios");
const ROBLOX_API_ENDPOINTS = {
    "users": "https://users.roblox.com",
    "thumbnails": "https://thumbnails.roblox.com"
}

class Roblox {
    constructor (cookie = '') {
        this.ROBLOX_COOKIE = cookie;
    }
    
    // "Public" functions
    // [[ User api functions ]]
    async getAuthenticated() { // Returns authenticated user data.
        if (!this.ROBLOX_COOKIE) {
            throw new Error('There\'s no ROBLOX COOKIE set.');
        }
        return this._doRequest('users', '/v1/users/authenticated')
    }

    async getIdsFromNames(usernames) { // Returns user ids from usernames, it doesn't need any cookies. 
        return this._doPostRequest('users', '/v1/usernames/users', {
            "usernames": usernames,
            "excludeBannedUsers": false
        });
    }

    // [[ Thumbnails functions ]]
    async getUserHeadShot(userId, size, format = "Png", isCircular = false) {
        return this._doRequest('thumbnails', '/v1/users/avatar-headshot', {
            userIds: userId,
            size: size,
            format: format,
            isCircular: isCircular
        });
    }


    // "Internal" functions
    async _doPostRequest(endpointName, api, bodyData) {
        const url = ROBLOX_API_ENDPOINTS[endpointName] + api;
        const response = await axios.post(url, bodyData, {
            headers: {
                'User-Agent': 'Roblox/WinInet',
                'Content-Type': 'application/json',
                'Cookie': this.ROBLOX_COOKIE
            }
        });
        return response.data;
    }

    async _doRequest(endpointName, api, params = {}) {
        const url = ROBLOX_API_ENDPOINTS[endpointName] + api;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Roblox/WinInet',
                'Content-Type': 'application/json',
                'Cookie': this.ROBLOX_COOKIE
            },
            params: params
        });
        return response.data;
    }
}

module.exports = Roblox;