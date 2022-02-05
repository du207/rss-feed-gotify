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
    try {
        for (const url of feeds) {
            const feed = await parser.parseURL(url);
            const latestFeed = feed.items.reduce((a, b) => (new Date(a.pubDate!) > new Date(b.pubDate!) ? a : b));

            if (!cache[url]) {
                cache[url] = latestFeed;
                continue;
            }

            if (latestFeed.link !== cache[url].link) {
                const text = `${latestFeed.link}\n\n${turndown.turndown(latestFeed.content ?? "")}`;
                await sendGotify(latestFeed.title!, text, 2);
                cache[url] = latestFeed;
            }
        }
    } catch (err) {
        console.error(err);
    }
}, /* 5 * 1000); // */ 30 * 60 * 1000); // 30 mins