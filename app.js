/**
 * byun-sungwoo
 * lolquiz - discord bot
 */

const Discord = require("discord.js");
const client = new Discord.Client();
const token = require("./token.js");
const fetch = require("node-fetch");

var championData = [];

let url = 'http://ddragon.leagueoflegends.com/cdn/10.25.1/data/en_US/champion.json';
let img = ['http://ddragon.leagueoflegends.com/cdn/img/champion/splash/', '_0.jpg'];

// ---------- ---------- ---------- ---------- ----------
/**
 * Takes text and finds all occurences of key.
 * Replace occurence of key with censor.
 * errorMargin is how loosely it will censor.
 * Utilizing KMP algorithm.
 * */
function filter(text, key, censor='____', errorMargin=1) {
	let error = 0;
	let output = '';
	let current = '';
	let k_idx = 0;
	for(let i = 0; i < text.length; i++) {
		// console.log(`${output} | c:${current}\nt:${i} | k${k_idx}\ne: ${error}\n\n`)
		current += text.charAt(i);
		if(text.charAt(i).toLowerCase() === key.charAt(k_idx).toLowerCase()) {
			k_idx++;
			if(k_idx === key.length) {
				output += censor;
				current = '';
				k_idx = 0;
				error = 0;
			}
		} else if(error < errorMargin && k_idx != 0) {
			error++;
		} else {
			output += current;
			current = '';
			k_idx = 0;
			error = 0;
		}
	}
	output += current;
	return output;
}

// console.log(filter('Aurelion Sol once AurelionSol Aurelion Sol graced the vast emptiness', 'aurelionsol'))
// console.log(filter(`From the moment Cho'Gath first emerged into the harsh light of Runeterra's sun, the beast was driven by the most pure and insatiable hunger. A perfect expression of the Void's desire to consume all life, Cho'Gath's complex biology quickly converts...`, 'chogath'))

// ---------- ---------- ---------- ---------- ----------
class Champion {
	constructor(name, blurb, title, tags) {
		this.name = name;
		this.title = title;
		this.tags = tags;
		this.blurb = blurb;
		this.blurbCensor = filter(blurb, name, '_____');
		this.image = img[0] + name + img[1];
	}
}

/**
 * n			- number of questions
 * questions	- list of questions
 * index		- starting from 0, current question being answered
 * gameover		- current gamestate
 */
class Game {
	constructor(n) {
		this.n = validRounds(n);
		this.questions = [];
		this.index = 0;
		this.gameover = false;
		this.initgame();
	}

	initgame() {
		for(let i = 0; i < this.n; i++) {
			let randChamp = Math.floor(Math.random()*championData.length);
			this.questions.push(randChamp);
			console.log(`PUSHING ${championData[randChamp].name}: ` + randChamp)
		}
	}

	isCorrect(ans) {
		ans = ans.split(' ').join('');
		ans = ans.split('\'').join('');
		if(ans.toLowerCase() === this.getChampion().name.toLowerCase()) {
			this.next();
			return true;
		}
		return false;
	}

	getChampion() {
		return !this.gameover ? championData[this.questions[this.index]] : null;
	}

	next() {
		this.index++;
		if(this.questions.length <= this.index)
			this.gameover = true;
	}
}

// ---------- ---------- ---------- ---------- ----------
var mainGame = null;
let mainIdx = 0;
let sIdx = -1;
let correct = false;

function reset() {
	mainIdx = 0;
	sIdx = -1;
	correct = false;
}

fetch(url)
	.then(res => res.json())	// load data first
	.then((out) => {
		let champions = out.data;
		for(var i in champions) {
			let tmp = champions[i];
			championData.push(new Champion(tmp.id, tmp.blurb, tmp.title, tmp.tags));
		}
	})
	.then(() => {	// then init
		initBot()
	}).catch(err => console.error(err));

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function validRounds(rounds) {
	if(rounds < 1)
		return 1;
	if(rounds > 10)
		return 10;
	return rounds;
}

function initBot() {
	client.on('ready', () => {
		console.log(`Logged in as ${client.user.tag}.`);
		client.user.setActivity('lol -help');
	})

	client.on('message', msg => {
		if(msg.author.bot) return;
		if(mainGame !== null && !mainGame.gameover) {
			if(mainGame.isCorrect(msg.content)){
				msg.react('👍');
				if(!mainGame.gameover)
					msg.channel.send(`${msg.author.username} got it!\nNext Question!`);
				correct = true;
			} else {
				msg.delete();
				// msg.react('🤣');
				// msg.react('🤏');
			}
		}
	})

	client.on('message', msg => {
		if(msg.author.bot) return;
		let embMessage = null;
		// console.log(`ID:${msg.author.id} "${msg.content}"`);
		let sp = msg.content.split('lol ')[1];
		let flag = false;
		if(msg.content.startsWith("lol") && sp !== undefined && sp.length > 0) {
			let input = sp.split(' ');
			switch(sp.toLowerCase().substring(0,2)) {
			case '-h':
				embMessage = new Discord.MessageEmbed()
					.setColor('#6161FF')
					.setTitle(`Command List`)
					.addFields(
						{ name: 'General', value: `\`lol -[command]\nlol -[first character of command]\``},
						{ name: 'Play', value: `\`lol -play [number of rounds]\``},
						{ name: 'Lookup Champion', value: `\`lol -lookup [champion name]\``},
						{ name: 'Start', value: `\`lol -start\``},
						{ name: 'Cancel', value: `\`lol -cancel\``},
					);
				msg.author.send(embMessage);
				msg.delete();
				break;
			case '-l':
				if(input === undefined || input.length <= 1) {
					embMessage = new Discord.MessageEmbed()
						.setColor('#FFB061')
						.setTitle(`Invalid Input For \`-l\``)
						.addFields(
							{ name: 'Was Expecting:', value: `\`lol -lookup [champion name]\``},
							{ name: 'Example:', value: `\`lol -l ahri\``},
						);
					msg.channel.send(embMessage);
				} else {
					let name = sp.replace(input[0], '');
					name = name.split(' ').join('');
					name = name.split('\'').join('');
					for(var i in championData) {
						if(championData[i].name.toLowerCase() === name.toLowerCase()) {
							// console.log(championData[i]);
							embMessage = new Discord.MessageEmbed()
								.setColor('#5BE6DB')
								.setTitle(`${championData[i].name}`)
								.setDescription(`${championData[i].blurb}`)
								.addFields(
									{ name: 'Title', value: `${championData[i].title}`},
									{ name: 'Class', value: `${championData[i].tags}`},
								)
								.setImage(`${championData[i].image}`);
							msg.channel.send(embMessage);
							flag = true;
						}
					}
					if(!flag) {
						embMessage = new Discord.MessageEmbed()
							.setColor('#FF6161')
							.setTitle(`Champion ${name} not found`);
						msg.channel.send(embMessage);
					}
				}
				break;
			case '-p':
				embMessage = new Discord.MessageEmbed()
					.setColor('#FFB061')
					.setTitle(`Invalid Input For \`-p\``)
					.addFields(
						{ name: 'Was Expecting:', value: `\`lol -play [number of rounds]\``},
						{ name: 'Example:', value: `\`lol -p 5\``},
					);
				if(input === undefined || input.length <= 1) {
					msg.channel.send(embMessage);
				} else {
					let rounds = sp.replace(input[0], '');
					if(rounds == parseInt(rounds, 10)) {
						if(mainGame === null || mainGame === undefined || mainGame.gameover) {
							let countdown = 5;
							embMessage = new Discord.MessageEmbed()
								.setColor('#FFB061')
								.setTitle(`Starting New Game`)
								.addFields(
									{ name: 'Rounds:', value: `${validRounds(rounds)}`},
									{ name: 'Game Starts In:', value: `${countdown}s`},
							);
							msg.channel.send(embMessage).then((msg)=> {
								(async() => {
									for(let i = 0; i <= countdown; i++) {
										embMessage = new Discord.MessageEmbed()
											.setColor('#FFB061')
											.setTitle(`Starting New Game`)
											.addFields(
												{ name: 'Rounds:', value: `${validRounds(rounds)}`},
												{ name: 'Game Starts In:', value: `${countdown-i}s`},
										);
										await sleep(1000);
										msg.edit(embMessage);
									}
									embMessage = new Discord.MessageEmbed()
										.setColor('#61FF61')
										.setTitle(`Game Started`)
										.addFields(
											{ name: 'Rounds:', value: `${validRounds(rounds)}`},
									);
									msg.edit(embMessage);
									mainGame = new Game(parseInt(rounds, 10));
									let sent;
									while(!mainGame.gameover) {
										for(let i = 0; i < 3; i++) {
											if(correct) {
												reset();
												break;
											}
											if(i === 0 && sIdx < mainGame.index) {
												sIdx++;
												embMessage = new Discord.MessageEmbed()
													.setColor('#FFB061')
													.setTitle(`Question ${mainGame.index+1}/${mainGame.questions.length}`)
													.addFields(
														{ name: 'Hint:', value: `${i+1}/${3}`},
														{ name: 'Title:', value: `${mainGame.getChampion().title}`},
												);
												if(mainIdx < 3)
													sent = await msg.channel.send(embMessage);
											} else {
												if(i === 1) {
													embMessage = new Discord.MessageEmbed()
													.setColor('#FFB061')
													.setTitle(`Question ${mainGame.index+1}/${mainGame.questions.length}`)
													.addFields(
														{ name: 'Hint:', value: `${i+1}/${3}`},
														{ name: 'Title:', value: `${mainGame.getChampion().title}`},
														{ name: 'Class:', value: `${mainGame.getChampion().tags}`},
													);
												} else {
													embMessage = new Discord.MessageEmbed()
													.setColor('#FFB061')
													.setTitle(`Question ${mainGame.index+1}/${mainGame.questions.length}`)
													.addFields(
														{ name: 'Hint:', value: `${i+1}/${3}`},
														{ name: 'Title:', value: `${mainGame.getChampion().title}`},
														{ name: 'Class:', value: `${mainGame.getChampion().tags}`},
														{ name: 'Lore:', value: `\`${mainGame.getChampion().blurbCensor}\``},
													);
												}
												if(mainIdx < 3)
													sent.edit(embMessage);
											}
											await sleep(10000);
											mainIdx++;
										}
									}
									if(mainGame !== null && mainGame.gameover) {
										embMessage = new Discord.MessageEmbed()
										.setColor('#61FF61')
										.setTitle(`End Of Game`)
										msg.channel.send(embMessage);
									} else {
										embMessage = new Discord.MessageEmbed()
										.setColor('#FF6161')
										.setTitle(`uh, this msg isn't supposed to show up...`)
										msg.channel.send(embMessage);
									}
								})();
							});
						} else {
							embMessage = new Discord.MessageEmbed()
								.setColor('#FF6161')
								.setTitle(`Game Already In Progress`);
							msg.channel.send(embMessage);
						}
					} else {
						embMessage = embMessage.setDescription(`__**number must be an integer**__`);
						msg.channel.send(embMessage);
					}
				}
				break;
			default:
				embMessage = new Discord.MessageEmbed()
					.setColor('#FF6161')
					.setTitle(`Invalid Command`)
					.setDescription(`\`lol -help\``)
					msg.channel.send(embMessage);
				break;
			}
		}
	})
	client.login(token)
}