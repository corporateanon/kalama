import fetch from 'node-fetch';
import cheerio = require('cheerio');
import { equal } from 'assert';

const SERVER_ROOT = 'https://myzuka.club';

export enum ItemType {
    Artist,
    Album,
    Song
}

export enum AlbumCategory {
    StudioAlbum = 2,
    EP = 3,
    Single = 4,
    ArtistCollection = 11,
    Demo = 9,
    Live = 6,
    SoundTrack = 14,
    Mixtape = 8,
    DJMix = 10,
    Bootleg = 5,
    VariousCollection = 7,
    FanCollection = 13,
    Other = 1
}

export interface Resource {
    url: string;
}

export interface Track extends Resource {
    url: string;
    title: string;
    duration?: number;
}

export interface Item extends Resource {
    id?: string;
    label: string;
    image?: string;
    type?: string;
}

export interface SearchResultItem extends Item {
    itemType: ItemType;
}

export interface Artist extends SearchResultItem {
    itemType: ItemType.Artist;
}

export interface Album extends SearchResultItem {
    albumCategory?: AlbumCategory;
    itemType: ItemType.Album;
    year?: number;
}

export interface Song extends SearchResultItem {
    itemType: ItemType.Song;
}

export interface SearchResult {
    artists: Array<Artist>;
    albums: Array<Album>;
    songs: Array<Song>;
}

const normalizeUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `${SERVER_ROOT}${url}`;
};

const decodeItem = (item: Item): SearchResultItem => {
    const parts = item.url.split('/');
    const itemTypeStr = parts[1];
    return {
        ...item,
        url: normalizeUrl(item.url),
        itemType: ItemType[itemTypeStr]
    };
};

export const search = async (term: string | null): Promise<SearchResult> => {
    if (term === null) {
        return {
            artists: [],
            albums: [],
            songs: []
        };
    }

    const res = await fetch(
        `${SERVER_ROOT}/Search/Suggestions?term=${encodeURIComponent(term)}`,
        {
            headers: { referer: SERVER_ROOT }
        }
    );
    const items = (await res.json()).map(decodeItem);
    return {
        artists: items.filter(item => item.itemType === ItemType.Artist),
        albums: items.filter(item => item.itemType === ItemType.Album),
        songs: items.filter(item => item.itemType === ItemType.Song)
    };
};

export const getArtistAlbumsList = async (
    artist: Resource
): Promise<Array<Album>> => {
    const url = artist.url;
    const albumsUrl = `${url}/Albums`;
    const queryResult = await fetch(albumsUrl, {
        headers: { referer: SERVER_ROOT }
    });
    const htmlText: string = await queryResult.text();
    return parseAlbumsListHtml(htmlText);
};

export const getTracksList = async (
    resource: SearchResultItem
): Promise<Array<Track>> => {
    const url = resource.url;
    const queryResult = await fetch(url, {
        headers: { referer: SERVER_ROOT }
    });
    const htmlText: string = await queryResult.text();
    let tracks = parseTracksListHtml(htmlText);
    if (resource.itemType === ItemType.Song) {
        tracks = tracks.slice(0, 1);
    }
    return Promise.all(tracks.map(resolveRedirectedTrack));
};

const parseDurationDOM = (durationBitrateDiv: any): number => {
    const mmss = durationBitrateDiv
        .text()
        .trim()
        .match(/^(\d\d):(\d\d)/);
    if (!mmss) {
        return null;
    }
    const [, m, s] = mmss;
    const seconds = parseInt(m, 10) * 60 + parseInt(s, 10);
    return seconds;
};

const parseYearDOM = (albumDiv: any): number => {
    const yearStr = albumDiv
        .find('.info > .tags > a[href^="/Albums/"]')
        .text()
        .trim();

    if (!yearStr || !yearStr.length || !yearStr.match(/^\d{4}$/)) {
        return null;
    }
    return parseInt(yearStr, 10);
};

const parseTracksListHtml = (htmlText: string): Array<Track> => {
    const $ = cheerio.load(htmlText);
    const nodes = $('[itemtype="http://schema.org/MusicRecording"]');
    return nodes
        .map((i, node) => {
            const playButton = $(node).find('.play [data-url]');
            const durationBitrateDiv = $(node).find('.options .data');
            return {
                url: playButton.attr('data-url'),
                title: playButton.attr('data-title'),
                duration: parseDurationDOM(durationBitrateDiv)
            };
        })
        .get()
        .filter(({ url }) => !!url)
        .map(({ url, title, duration }) => ({
            url: normalizeUrl(url),
            title,
            duration
        }));
};

const parseAlbumsListHtml = (htmlText: string): Array<Album> => {
    const $ = cheerio.load(htmlText);
    const albumNodes = $('.album-list > .item');
    return albumNodes
        .map((i, node) => {
            const $node = $(node);
            return {
                url: $node.find('.info > .title > a').attr('href'),
                label: $node.find('.info > .title > a').text(),
                year: parseYearDOM($node),
                albumCategory: parseInt($node.attr('data-type'), 10),
                image: $node.find('.vis > a > img').attr('src')
            };
        })
        .get()
        .map(item => ({
            ...item,
            url: normalizeUrl(item.url),
            image: normalizeUrl(item.image)
        }));
};

export const resolveRedirectedTrack = async (
    resource: Track
): Promise<Track> => {
    const response = await fetch(resource.url, {
        method: 'HEAD',
        redirect: 'manual'
    });
    const location = response.headers.get('Location');
    equal(response.status, 302, 'Resource should be redirected');
    return { ...resource, url: location };
};
