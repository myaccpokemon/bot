const { WAConnection, MessageType, Presence } = require('@adiwajshing/baileys')
const { color, bgcolor } = require('./lib/color')
const { getDolar, getSigeach, getBuffer, getRandom, animeWhich, phpString } = require('./lib/functions')
const { exec } = require('child_process')
const functions = require('./lib/functions')
const tesseract = require("node-tesseract-ocr")
const moment = require('moment-timezone')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const pngToJpeg = require('png-to-jpeg')

async function connection() {
	const prefix = '!'
	const log = []
	let stickVideo = []
	let stickImage = []
	let animeList = []
	let toimgList = []

	const { 
		text, 
		extendedText, 
		contact, 
		location, 
		liveLocation, 
		image, 
		video, 
		sticker, 
		document,
		audio,
		product
	} = MessageType

	const conn = new WAConnection()
	conn.logger.level = 'fatal'

	if (fs.existsSync('./sessions.json') && conn.loadAuthInfo('./sessions.json')) {
		console.log('Recuperando sessao anterior...')
		const authInfo = conn.base64EncodedAuthInfo()
	} 

	conn.on('qr', () => {
		console.log(color('Escaneiei o QR CODE acima: '))
	})
	conn.on('connection', () => {
		console.log(color('Conectando...'))
	})
	conn.on('open', () => {
		console.log(color('✔ Conectado'))

		if (fs.existsSync('./sessions.json') === false) {
			const authInfo = conn.base64EncodedAuthInfo()
	  		fs.writeFileSync('./sessions.json', JSON.stringify(authInfo, null, '\t')) 
		}
	})
	conn.on('close', async (reason, isReconnecting) => {
	    console.log(color("Desconectado " + reason.reason, 'red'))
	    
	    if(reason.reason === 'lost'){
	        conn.close()
	        conn.loadAuthInfo(authInfo)
	        conn.connect()
	        return {}
	    }
	    if(reason.reason != 'intentional'){
	        console.log(color('Não foi possivel se reconectar', 'gray'))
	        if (fs.existsSync('./sessions.json')) {
	        	fs.unlinkSync('./sessions.json')
	        }
	    }
	})

	conn.on('ws-close', () => {
		console.log(color('Socket desconectado', 'red'))
	})
	await conn.connect()
	conn.on('credentials-updated', () => {
	    console.log (color('credenciais atualizadas!'))
	    const authInfo = conn.base64EncodedAuthInfo()
	    fs.writeFileSync('./sessions.json', JSON.stringify(authInfo, null, '\t')) 
	})
	
	conn.on('chats-received', async ({ hasNewChats }) => {
        const unread = await conn.loadAllUnreadMessages ()
        const EOL = '\n ~> '
		const BOT_INFO = '\n' + EOL + color(conn.chats.length, 'white') + ' contatos disponiveis' + EOL + color(unread.length, 'white') + ' novas mensagens'
		console.log(BOT_INFO)
		console.log(color('\n\nCONSOLE: '))

		chats = await conn.chats.all()
		for (let chat of chats) {
		    if (chat.jid.endsWith('@g.us')) {
		    	//conn.sendMessage(chat.jid, 'estou online 🍃', MessageType.text)
		    }				
		}
    })

    setInterval(async function() {
    	if (toimgList.length > 0) {
    		let [tm] = toimgList

    		if (tm.done === false) {
    			if (tm.started === false) {
    				tm.started = true

    				let encmedia = tm.encmedia
					let media = await conn.downloadAndSaveMediaMessage(encmedia)
					let random = getRandom('.png')

					try {
						exec(`ffmpeg -i ${media} ${random}`, async (error) => {
							toimgList.shift()

							if (error) {
								console.log(error)
							} else {
								let imageBuffer
							    await pngToJpeg({quality: 90})(fs.readFileSync(random))
								.then(output => imageBuffer = output)
								conn.sendMessage(tm.from, imageBuffer, image, {quoted: tm.messages})
							}
							fs.unlinkSync(media)
							fs.unlinkSync(random)
						})
					} catch (error) {
						console.log(error)
					}
    			}
    		}
    	}
    	if (animeList.length > 0) {
    		let [anime] = animeList

    		if (anime.done === false) {
    			if (anime.started == false) {
    				anime.started = true

    				try {
    					let encmedia = anime.encmedia
	    				media = await conn.downloadMediaMessage(encmedia)
						await animeWhich(media)
						.then(res => {
							conn.sendMessage(anime.from, res.video, video, {quoted: anime.messages, caption: res.text.trim()})
							animeList.shift()
						})
						.catch(err => {
							animeList.shift()
							reply(err)
						})
    				} catch (err) {
    					animeList.shift()
    					conn.sendMessage(anime.from, `Ei, Desculpe-me mas deu um erro ao analisar a foto`, text, {quoted: anime.messages})
    				}
    			}
    		}
    	}
    	if (stickImage.length > 0) {
    		let [stick] = stickImage

    		if (stick.done === false) {
    			if (stick.started === false) {
    				stick.started = true

    				try {
    					let encmedia = stick.encmedia
    					let media = await conn.downloadAndSaveMediaMessage(encmedia)
						let random = getRandom('.webp')
						let mpeg = await ffmpeg(`./${media}`)
						mpeg.on('end', function () {
							conn.sendMessage(stick.from, fs.readFileSync(random), sticker, {quoted: stick.messages})
							fs.unlink(media, function (err) {
								if (err) throw err
							})
							fs.unlink(random, function (err) {
								if (err) throw err
							})
							stickImage.shift()
						})
						mpeg.input(media)
						mpeg.on('error', function (err) {
							stickImage.shift()
							fs.unlink(media, function (err) {
								if (err) throw err
							})
							conn.sendMessage(stick.from, `Ei, não consguir fazer seu stick :(`, text, {quoted: stick.messages})
						})
						mpeg.addOutputOptions([`-vcodec`,`libwebp`,`-vf`,`scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`])
						mpeg.toFormat('webp')
						mpeg.save(random)
    				} catch (err) {
    					stickImage.shift()
    					conn.sendMessage(stick.from, `Ei, tente criar o stick novamente respodendo a media que você mandou com ${prefix}fig`, text, {quoted: stick.messages})
    				}
    			}
    		}
    	}
    	if (stickVideo.length > 0) {
    		let [stick] = stickVideo

    		if (stick.done === false) {
    			if (stick.started === false) {
    				stick.started = true

    				try {
    					let encmedia = stick.encmedia
	    				let media = await conn.downloadAndSaveMediaMessage(encmedia)
						let random = getRandom('.webp')
						let mpeg = await ffmpeg(`./${media}`)
						mpeg.on('end', function () {
							conn.sendMessage(stick.from, fs.readFileSync(random), sticker, {quoted: stick.messages})
							fs.unlink(media, function (err) {
								if (err) throw err
							})
							fs.unlink(random, function (err) {
								if (err) throw err
							})
							stickVideo.shift()
						})
						mpeg.inputFormat(media.split('.')[1])
						mpeg.on('error', function (err) {
							stickVideo.shift()
							fs.unlink(media, function (err) {
								if (err) throw err
							})
							let mediaType = media.endsWith('.mp4') ? 'video' : 'gif'
							conn.sendMessage(stick.from, `Ei, pode me desculpar? não consguir converte seu aquivo ${mediaType} para stick :(`, text, {quoted: stick.messages})
						})
						mpeg.addOutputOptions([`-vcodec`,`libwebp`,`-vf`,`scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`])
						mpeg.toFormat('webp')
						mpeg.save(random)
    				} catch (err) {
    					stickVideo.shift()
    					conn.sendMessage(stick.from, `Ei, tente criar o stick novamente respodendo a media que você mandou com ${prefix}fig`, text, {quoted: stick.messages})
    				}
    			}
    		}
    	}
    }, 1)

	conn.on('chat-update', async (chat) => {
		try {
			chat = JSON.parse(JSON.stringify(chat))

			if (chat.hasNewMessage) {
				if (chat.messages) {
					const [messages] = chat.messages

					if (messages.message && messages.key) {
						const user = conn.user
						const jid = user.jid
						const name = user.name
						const [number] = jid.split('@')
						const key = messages.key

						const from = key.remoteJid
						const received = !key.fromMe
						const id = key.id

						const message = messages.message
						const [type] = Object.keys(message)
						const content = JSON.stringify(message)
						const group = from.endsWith('@g.us')

						let g_metadata
						let g_name
						let g_id 
						let g_desc
						let g_admins
						let g_participants
						let user_admin
						let sender = jid
						let sender_name = name
						let sender_number = number
						let sender_admin
						let sender_notify = null
						let input

						if (type === 'conversation') {
							input = message[type]
						} else if (type === 'extendedTextMessage') {
							input = message[type].text
						} else {
							input = message[type].caption
						}

						if (input == undefined) {
							input = ''
						}

						const command = input.startsWith(prefix)
						const slice = input.slice(1)
						const trim = slice.trim()
						const split = trim.split(/ +/)
						const shift = split.shift()
						const commandName = shift.toLowerCase()
						const args = input.trim().split(/ +/).slice(1)

						if (received) {
							if (group) {
								sender = messages.participant
							} else {
								sender = from
							}
							let [numberr] = sender.split('@')
							sender_number = numberr
						}

						if (group) {
							g_metadata = await conn.groupMetadata(from)
							g_name = g_metadata.subject
							g_id = g_metadata.jid
							g_desc = g_metadata.desc
							g_participants = g_metadata.participants
							g_admins = []

							for (let participant of g_participants) {
								if (participant.isAdmin) {
									g_admins.push(participant.jid)
								}
								if (sender == participant.jid) {
									if (participant.notify) {
										sender_notify = participant.notify
									}
								}
							}

							if (g_admins.includes(jid)) {
								user_admin = true
							} else {
								user_admin = false
							}

							if (g_admins.includes(sender)) {
								sender_admin = true
							} else {
								sender_admin = false
							}
						}

						const info = {
							user: user,
							admin: user_admin,
							number: number,
							from: from,
							sender: {
								jid: sender,
								name: sender_name
							},
							received: received,
							id: id,
							message: message,
							type: type,
							content: content,
							group: group,
							group: {
								name: g_name,
								id: g_id,
								admins: g_admins,
								participants: g_participants
							}
						}
						const json = JSON.stringify(info, null, '\t')

						const data = new Date()

						const day = data.getDate();
						const month = data.getMonth() + 1;
						const year = data.getFullYear();
						const hours = data.getHours();
						const minutes = data.getMinutes();
						const secunds = data.getSeconds();
						const str_date = `${day}/${month}/${year}`
						const str_minutes = `${hours}:${minutes}:${secunds}`

						const time = `${str_date}:${str_minutes}`

						if (!group && !command) {
							console.log("[" + color(time, 'orange') + "] " + color("[Nova Mensagem] ", 'white') + color(`${sender_name} (${sender_number})`, 'gray') + ": " + color(input, 'white'))
						} else if (group && !command) {
							console.log("[" + color(time, 'orange') + "] " + color("[Nova Mensagem] ", 'white') + color(g_name, 'white') + ": " + color(`${sender_name} (${sender_number})`, 'gray') + ": " + color(input, 'white'))
						} else if (command && !group) {
							console.log("[" + color(time, 'orange') + "] " + color("[Comando] ", 'white') + color(`${sender_name} (${sender_number})`, 'gray') + ": " + color(input, 'white'))
						} else if (command && group) {
							console.log("[" + color(time, 'orange') + "] " + color("[Comando] ", 'white') + color(g_name, 'white') + ": " + color(`${sender_name} (${sender_number})`, 'gray') + ": " + color(input, 'white'))
						}

						let isMedia = false
						let isImage = false
						let isVideo = false
						let isSticker = false
						let isQuoted = false
						let isQuotedImage = false
						let isQuotedVideo = false
						let isQuotedSticker = false

						if (type === 'imageMessage' || type === 'videoMessage') {
							isMedia = true
							if (type === 'imageMessage') {
								isImage = true
							} else if (type === 'videoMessage') {
								isVideo = true
							}
						} else if (type === 'extendedTextMessage') {
							isQuoted = true
							if (content.includes('imageMessage')) {
								isQuotedImage = true
							} else if (content.includes('videoMessage')) {
								isQuotedVideo = true
							} else if (content.includes('stickerMessage')) {
								isQuotedSticker = true
							}
						}

						const clone = (obj) => {
							if (typeof obj !== 'object' || obj === null) {
								return obj
							}

							let cloned, i
							if (obj instanceof Date) {
								cloned = new Date(obj.getTime())
								return cloned
							}

							if (obj instanceof Array) {
								let l
								cloned = []
								for (i = 0, l = obj.length; i < l; i++) {
									cloned[1] = clone(obj[i])
								}

								return cloned
							}

							cloned = {}
							for (i in obj) if (obj.hasOwnProperty(i)) {
								cloned[i] = clone(obj[i])
							}
							return cloned
						}

						const parseMessages = () => {
							let m = clone(messages)

							if (isMedia) {
								m.message[type] = {
									caption: m.message[type].caption
								}
							} else if (isQuoted) {
								delete m.message.extendedTextMessage.contextInfo.quotedMessage
							}
							return m
						}

						const reply = (msg, bytes = undefined) => {
							let m = parseMessages()
							if (bytes != undefined) {
								conn.sendMessage(from, bytes, sticker, {quoted: m})
							} else {
								conn.sendMessage(from, msg, text, {quoted: m})
							}
						}

						const sendMessage = (msg) => {
							conn.sendMessage(from, msg, text)
						}

						const mentions = (text, memberr, id) => {
							if (id == null || id == undefined || id == false) {
								conn.sendMessage(from, text, extendedText, {contextInfo: {"mentionedJid": memberr}})
							} else {
								conn.sendMessage(from, text, extendedText, {quoted: messages, contextInfo: {"mentionedJid": memberr}})
							}
						}
						
						if (command) {
							switch (commandName) {
								case 'help':
									let commands = {
										bot: 'Veja as informações do bot',
										dolar: 'Veja o valor atual do dolar',
										calc: 'Resolva um calculo simples de matematica',
										sigeach: 'Pesquise por significado de nomes',
										fig: 'Transforme fotos, videos ou gifs em figurinha',
										toimg: 'Transforme figurinhas em foto, video ou gif',
										status: 'Veja seu status ou de outra pessoa',
										anime: 'Descubra qual é o anime atraves de uma foto'
									}
									let command_list = [`*AQUI ESTA A LISTA DE COMANDOS:*\n`]
									Object.entries(commands).forEach(([key, value]) => command_list[command_list.length] = `*${prefix}${key}:*\n  descrição: _${value}_`)
									command_list[command_list.length] = `\n~ Para usar qualquer comando digite ele no chat`
									reply(command_list.join('\n'))
									break
								case 'bot':
									let text = `*PERFIL DO BOT*\n\nNome: ${name}\nNumero: ${number}\nJid: ${jid}\nMensagem direta: wa.me/${number}`
									reply(text)
									break
								case 'profile':
									reply('Futuramente..')
									break
								case 'dolar':
									try {
										let dolar = await getDolar()
										reply(`1 Dólar americano igual a *${dolar}* Real brasileiro`)
									} catch {
										reply('>< Desculpe-me, não conseguir pegar o valor do dolar')
									}
									break
								case 'json':
									reply(json)
									break
								case 'log':
									if (args.length < 1) {
										reply('Ei, use *' + prefix + 'log* ver,clear')
									} else {
										let subCommand = args[0].toLowerCase()
										switch (subCommand) {
											case 'ver':
												if (from in log) {
													if (log[from].length < 1) {
														var list = 'vazio...'
													} else {
														var list = log[from].join('\n')
													}
												} else {
													var list = 'vazio...'
												}
												reply('*MENSAGENS RECENTES:*\n\n' + list)
												break
											case 'clear':
												log[from] = []
												reply('Log limpo...')
												break
											default:
												reply('Ei, use *' + prefix + 'log* ver,clear')
												break
										}
									}
									break
								case 'calc':
									if (args.length < 1) {
										reply(`Ei, não sabe calcular... então veio aqui, e ainda por cima não me falar qual é o calculo aiai, tente assim: ${prefix}calc 1+2 ou a=1 b=a c=b c+9`)
									} else {
										try {
											let result = eval(args.join())
											reply('Resultado: ' + result)
										} catch (err) {
											reply('Desculpe-me, não conseguir calcular isso, seria eu um burro? ou você?')
										}
									}
									break
								case 'sigeach':
								case 'signame':
									if (args.length < 1) {
										reply(`Ei, diga o nome da pessoam, exemplo: ${prefix}sigeach João`)
									} else {
										try {
											reply('Pesquisando por ' + args.join(' ') + '...')
											let signame = args.join('-').normalize("NFD").replace(/[^a-zA-Zs]/g, "").toLowerCase()
											let result = await getSigeach(signame)
											reply(`${result}`)
										} catch {
											reply('>< me desculpe, não achei nenhum significado para ' + args.join(' ') + ', isso é mesmo um nome?')
										}
									}
									break
								case 'status':
									if (message.extendedTextMessage) {
										mentioneds = message.extendedTextMessage.contextInfo.mentionedJid

										if (mentioneds.length > 1) {
											reply('Ei, você so pode marcar uma pessoa')
										} else {
											const [mentioned] = mentioneds
											const [mentioned_numberr] = mentioned.split('@')
											let status = await conn.getStatus(mentioned)
											status = status['status']

											if (status.length > 0) {
												mentions(`Status de @${mentioned_numberr}: ${status}`, mentioneds, true)
											} else {
												reply(`>< ${mentioned} não possui status`)
											}
										}
									} else {
										let status = await conn.getStatus(from)
										status = status['status']
										if (status.length > 0) {
											reply(`Seu status: ${status}`)
										} else {
											reply(`>< você não possui nenhum status`)
										}
									}
									break
								case 'fig':
									if (args.length > 0) {
										let subCommand = args[0].toLowerCase()
										if (subCommand === 'nobg') {
											reply('Futuramente...')
										} else {
											reply(`Ei, use ${prefix}fig nobg na legenda ou marque uma foto _para criar uma figurinha sem fundo._`)
										}
									} else {
										if (isMedia || isQuotedImage || isQuotedVideo) {
											let encmedia
											if (isQuoted) {
												if (isQuotedImage) {
													encmedia = message.extendedTextMessage.contextInfo.quotedMessage
												} else if (isQuotedVideo) {
													encmedia = message.extendedTextMessage.contextInfo.quotedMessage
												}
											} else if (isImage) {
												encmedia = message
											} else if (isVideo) {
												encmedia = message
											}

											encmedia = {
												message: encmedia
											}

											if (encmedia !== undefined) {
												if (isImage || isQuotedImage) {
													stickImage[stickImage.length] = {
														encmedia: encmedia,
														from: from,
														messages: parseMessages(),
														done: false,
														started: false
													}
												} else {
													let seconds = encmedia.message.videoMessage.seconds

													if (seconds <= 10) {
														stickVideo[stickVideo.length] = {
															encmedia: encmedia,
															from: from,
															messages: parseMessages(),
															done: false,
															started: false
														}
														reply(`Baixando midia para converte...`)
													} else {
														reply(`Ei, so posso criar uma figurinha animado de no maximo 10 segundos, essa midia tem ${seconds} segundos`)
													}
												}
											} else {
												reply('Ei, não conseguir fazer o download da midia para fazer a figurinha :(')
											}
										} else {
											reply(`Ei, use ${prefix}fig na legenda de uma foto, video ou gif para criar a figurinha`)
										}
									}
									break
								case 'toimg':
									if (isQuotedSticker) {
										let encmedia = {
											message: message.extendedTextMessage.contextInfo.quotedMessage
										}
										let isAnimated = encmedia.message.stickerMessage.isAnimated

										if (isAnimated) {
											reply('Ei, você não pode usar isso em figurinhas animadas')
											break
										}

										toimgList[toimgList.length] = {
											encmedia: encmedia,
											from: from,
											messages: parseMessages(),
											done: false,
											started: false
										}
									} else {
										reply('Ei, marque uma figurinha.')
									}
									break
								case 'ocr':
									if (isMedia || isQuoted) {
										if (isVideo || isQuotedVideo || isQuotedSticker) {
											reply('Vocẽ so pode usar isso em foto')
										} else {
											let encmedia
											if (isQuotedImage) {
												encmedia = message.extendedTextMessage.contextInfo.quotedMessage
											} else {
												encmedia = message
											}
											encmedia = {
												message: encmedia
											}

											try {
												let media = await conn.downloadAndSaveMediaMessage(encmedia)
												let config = {
													lang: 'eng+ind', 
													oem: 1, 
													psm: 3
												}
												await tesseract.recognize(media, config)
													.then(text => {
														fs.unlink(media, function (err) {
															if (err) throw(err)
														})
														text = text.trim()

														if (text.length > 0) {
															reply(text)
														} else {
															reply('Não a nada para ler nessa image')
														}
													})
													.catch(err => {
														fs.unlink(media, function (err) {
															if (err) throw(err)
														})
														reply('Ei, Desculpe-me não conseguir fazer a leitura')
													})
											} catch (error) {
												reply('Ei, Desculpe-me não conseguir fazer a leitura')
											}
										}
									}
									break
								case 'anime':
									if (isMedia || isQuoted) {
										if (isImage || isQuotedImage) {
											let encmedia
											if (isQuotedImage) {
												encmedia = message.extendedTextMessage.contextInfo.quotedMessage
											} else {
												encmedia = message
											}
											encmedia = {
												message: encmedia
											}
											animeList[animeList.length] = {
												encmedia: encmedia,
												from: from,
												messages: parseMessages(),
												done: false,
												started: false
											}
											reply('Procurando por esse anime...')
										} else {
											reply('Ei, você so pode usar isso em foto.')
										}
									} else {
										reply('Ei, marque uma foto ou enviei com essa legenda.')
									}
									break
								default:
									reply('Ei, use *' + prefix + 'help* para ver as opções')
									break
							}
						} else {
							let newLogMessage = `*[${time}]* ${sender_number}: ${input}`
							if (from in log) {
								log[from][log[from].length] = newLogMessage
							} else {
								log[from] = [newLogMessage]
							}
						}
					}
				}
			}
		} catch (err) {
			console.log(color(err, 'white'))
		} 
	})	
}
connection()
//.catch (err => console.log(color("unexpected error: " + err, 'red')))