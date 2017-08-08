import fetch from 'node-fetch';
// import cheerio from 'cheerio';
import cheerio = require('cheerio');

const SERVER_ROOT = 'https://myzuka.me';
const PLAYER = 'vlc';
const NEW_SEARCH = 'NEW_SEARCH';

enum ItemType {
    Artist,
    Album,
    Song
}

enum AlbumCategory {
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

interface Resource {
    url: string;
}

interface Item extends Resource {
    id: string;
    label: string;
    image?: string;
    type: string;
}

interface SearchResultItem extends Item {
    itemType: ItemType;
}

interface Artist extends SearchResultItem {}

interface Album extends SearchResultItem {
    albumCategory?: AlbumCategory
}

interface Song extends SearchResultItem {}

interface SearchResult {
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

export const search = async (term: string): Promise<SearchResult> => {
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

export const getArtistAlbumsList = async (artist: Resource): Promise<any> => {
    const url = artist.url;
    const albumsUrl = `${url}/Albums`;
    const queryResult = await fetch(albumsUrl, {
        headers: { referer: SERVER_ROOT }
    });
    const htmlText: string = await queryResult.text();
    console.log(htmlText);
    return parseAlbumsListHtml(htmlText);
};

const parseAlbumsListHtml = (htmlText: string): Array<Album> => {
    const $ = cheerio.load(htmlText);
    const albumNodes = $('.album-list > .item');
    return albumNodes
        .map((i, node) => ({
            url: $(node).find('.info > .title > a').attr('href'),
            label: $(node).find('.info > .title > a').text(),
            albumCategory: parseInt($(node).attr('data-type'), 10),
            image: $(node).find('.vis > a > img').attr('src')
        }))
        .get()
        .map(item => ({
            ...item,
            url: normalizeUrl(item.url),
            image: normalizeUrl(item.image)
        }));
};