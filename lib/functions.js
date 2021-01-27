const fetch = require('node-fetch')
const cheerio = require('cheerio')
const axios = require('axios')
const fs = require('fs')

const apiadvisor = `http://apiadvisor.climatempo.com.br/api/v1`
const dolarhoje = `https://dolarhoje.com/`
const codnome = `https://dicionariodenomesproprios.com.br`
const advisor_token = './advisor_token.json'
const advisor_token_id = '4be57e7f1e0f967e20a4d886ab443ef9'

const fethHtml = async (url) => {
    try {
        const { data } = await axios.get(url)
        return data
    } catch {
        console.error(`ERROR: An error occurred while trying to fetch the URL: ${url}`)
    }
}

const getDolar = async () => {
    const html = await fethHtml(dolarhoje)

    const selector = cheerio.load(html)

    const symbol = selector('span.nacional').find('.symbol').text().trim()
    const result = selector('input').filter('#nacional').attr('value').trim()
    const searchResults = symbol + result
    return searchResults
}

const getSigeach = async (name) => {
    const html = await fethHtml(`${codnome}/${name}/`)

    const selector = cheerio.load(html)

    const searchResults = selector('body').find('div > .detail > #significado > p').text().trim()
    return searchResults
}

const getBuffer = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch (e) {
        console.log(`[Error]: ${e}`)
    }
}

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

const animeWhich = async (media) => new Promise(async (resolve, reject) => {
    const attachmentData = `data:image/jpeg;base64,${media.toString('base64')}`
    const response = await fetch("https://trace.moe/api/search",{method: "POST",body: JSON.stringify({image: attachmentData }),headers: { "Content-Type": "application/json" }});

    if (response.ok) {
        const result = await response.json()
        try {
            const { is_adult, title, title_chinese, title_romaji, title_english, episode, season, similarity, filename, at, tokenthumb, anilist_id } = result.docs[0]
            let belief = () => similarity < 0.89 ? "*Existe uma posibilidade de não ser isso*: " : ""
            let ecch = () => is_adult ? "Sim" : "Não"
            let text = `
    ${belief()}
- Título: *${title_english}*
- Temporada: *${season}*
- Episódio: *${episode}*
- Ecchi: *${ecch()}*`
            resolve({
                video: await getBuffer(`https://media.trace.moe/video/${anilist_id}/${encodeURIComponent(filename)}?t=${at}&token=${tokenthumb}`), 
                text: text
            });
        } catch (e) {
            reject(`Não sei que anime é esse :(`)
        }
    } else {
        reject(`Imagem não encontrada!`);
    }
})

const phpString = async (code) => {
}

module.exports = { getDolar, getSigeach, getBuffer, getRandom, animeWhich, phpString }