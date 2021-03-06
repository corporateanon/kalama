import { takeEvery, call, select } from 'redux-saga/effects';
import { mpTrack } from '../services/mixpanel';
import {
    ON_QUERY_RESULT,
    getQuery,
    ON_SUGGECTION_SELECT,
    ON_ALBUM_SELECT
} from '../ducks/search';
import { DOWNLOAD_CURRENT_PLST } from '../ducks/download';
import { getParentResource } from '../ducks/tracks';

export default function* mixpanelSaga() {
    yield takeEvery(ON_QUERY_RESULT, function*() {
        const query = yield select(getQuery);
        yield call(mpTrack, ON_QUERY_RESULT, { q: query });
    });

    yield takeEvery(ON_SUGGECTION_SELECT, function*({ payload }) {
        const query = yield select(getQuery);
        yield call(mpTrack, ON_SUGGECTION_SELECT, {
            q: query,
            label: payload.label,
            url: payload.url
        });
    });

    yield takeEvery(ON_ALBUM_SELECT, function*({ payload }) {
        const query = yield select(getQuery);
        yield call(mpTrack, ON_ALBUM_SELECT, {
            q: query,
            label: payload.label,
            url: payload.url
        });
    });

    yield takeEvery(DOWNLOAD_CURRENT_PLST, function*() {
        const query = yield select(getQuery);
        const plst = yield select(getParentResource);
        yield call(mpTrack, DOWNLOAD_CURRENT_PLST, {
            q: query,
            label: plst.label,
            url: plst.url
        });
    });
}
