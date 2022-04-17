import Parser, {Item} from "rss-parser";
import { feeds, gotify } from "./config.json";
import axios from "axios";
import Turndown from "turndown";

const parser = new Parser();
const turndown = new Turndown();

interface stateType {
    [key: string]: {
            [key: string]: any;
        } & Item;
}

let cache: stateType = {};

const sendGotify = async (title: string, message: string, priority: number) => {
    await axios({
        url: `${gotify.url}/message?token=${gotify.token}`,
        method: "post",
        data: {
            title,
            message,
            priority,
            extras: {
                "client::display": {
                    "contentType": "text/markdown"
                }
            }
        },
        headers: {
            "Content-Type": "application/json"
        },
        
    });
};

const interval = setInterval(async () => {
    for (const url of feeds) {
        try {
            const feed = await parser.parseURL(url);
            const latestFeed = feed.items.reduce((a, b) => (new Date(a.pubDate!) > new Date(b.pubDate!) ? a : b));

            if (!cache[url]) {
                cache[url] = latestFeed;
                continue;
            }

            if (latestFeed.link !== cache[url].link) {
		console.log(`New feed in ${url}`);
                const text = `${latestFeed.link}\n\n${turndown.turndown(latestFeed.content ?? "")}`;
                await sendGotify(latestFeed.title!, text, 2);
                cache[url] = latestFeed;
            }
        } catch (err) {
	    console.error(`Error in ${url}`);
	    console.error(new Date().toISOString());
            console.error(err);
	    continue;
        }
    }
}, /* 5 * 1000); // */ 10 * 60 * 1000); // 10 mins

console.log("Started");
