/**
 * byun-sungwoo
 * lolquiz - discord bot
 */

const Discord = require("discord.js")
const client = new Discord.Client()
const token = require("./token.js")
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

class Question {
	constructor(answer = '123') {
		this.winner = null;
		this.answer = answer;
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
		if(n < 1) n = 1;
		if(n > 10) n = 10;
		this.n = n;
		this.questions = [];
		this.index = 0;
		this.gameover = false;
		initgame();
	}

	initgame() {
		for(let i = 0; i < this.n; i++) {
			this.questions.push(new Question(`answer ${i}`));
		}
	}

	next() {
		if(this.questions.length >= index) {
			this.gameover = true;
			console.log('> game over')
		} else {
			index++;
			console.log(`> count increased to ${index}`)
		}
	}
}

// ---------- ---------- ---------- ---------- ----------
var mainGame = null;

fetch(url)
	.then(res => res.json())
	.then((out) => {
		let champions = out.data;
		for(var i in champions) {
			let tmp = champions[i];
			championData.push(new Champion(tmp.id, tmp.blurb, tmp.title, tmp.tags));
		}
	})
	.then(() => {
		initBot()
	}).catch(err => console.error(err));

function initBot() {
	client.on('ready', () => {
		console.log(`Logged in as ${client.user.tag}.`)
		client.user.setActivity('lol -help') 
	})

	client.on('message', msg => {
		let embMessage = null;
		if(msg.author.bot) return;
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
					);
				msg.channel.send(embMessage);
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
							console.log(championData[i]);
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
						if(mainGame === null || mainGame === undefined) {
							embMessage = new Discord.MessageEmbed()
								.setColor('#61FF61')
								.setTitle(`Starting New Game`)
								.addFields(
									{ name: 'Rounds:', value: `${rounds}`},
									// { name: 'Cancel:', value: `\`lol -cancel\``},
								);
							msg.channel.send(embMessage);
							// mainGame = new Game(parseInt(rounds, 10));
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