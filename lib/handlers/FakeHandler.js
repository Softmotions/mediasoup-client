import { EnhancedEventEmitter } from '../EnhancedEventEmitter';
import { Logger } from '../Logger';
import { FakeMediaStreamTrack } from 'fake-mediastreamtrack';
import * as utils from '../utils';
import * as ortc from '../ortc';
import { HandlerInterface } from './HandlerInterface';
const logger = new Logger('FakeHandler');
class FakeDataChannel extends EnhancedEventEmitter {
    constructor({ id, ordered, maxPacketLifeTime, maxRetransmits, label, protocol }) {
        super();
        this.id = id;
        this.ordered = ordered;
        this.maxPacketLifeTime = maxPacketLifeTime;
        this.maxRetransmits = maxRetransmits;
        this.label = label;
        this.protocol = protocol;
    }
    close() {
        this.safeEmit('close');
    }
    send(data) {
        this.safeEmit('message', data);
    }
    addEventListener(event, fn) {
        this.on(event, fn);
    }
}
export class FakeHandler extends HandlerInterface {
    constructor(fakeParameters) {
        super();
        // Local RTCP CNAME.
        this._cname = `CNAME-${utils.generateRandomNumber()}`;
        // Got transport local and remote parameters.
        this._transportReady = false;
        // Next localId.
        this._nextLocalId = 1;
        // Sending and receiving tracks indexed by localId.
        this._tracks = new Map();
        // DataChannel id value counter. It must be incremented for each new DataChannel.
        this._nextSctpStreamId = 0;
        this.fakeParameters = fakeParameters;
    }
    /**
     * Creates a factory function.
     */
    static createFactory(fakeParameters) {
        return () => new FakeHandler(fakeParameters);
    }
    get name() {
        return 'FakeHandler';
    }
    close() {
        logger.debug('close()');
    }
    // NOTE: Custom method for simulation purposes.
    setConnectionState(connectionState) {
        this.emit('@connectionstatechange', connectionState);
    }
    async getNativeRtpCapabilities() {
        logger.debug('getNativeRtpCapabilities()');
        return this.fakeParameters.generateNativeRtpCapabilities();
    }
    async getNativeSctpCapabilities() {
        logger.debug('getNativeSctpCapabilities()');
        return this.fakeParameters.generateNativeSctpCapabilities();
    }
    run({ 
    /* eslint-disable @typescript-eslint/no-unused-vars */
    direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, proprietaryConstraints, extendedRtpCapabilities
    /* eslint-enable @typescript-eslint/no-unused-vars */
     }) {
        logger.debug('run()');
        // Generic sending RTP parameters for audio and video.
        // @type {Object}
        this._rtpParametersByKind =
            {
                audio: ortc.getSendingRtpParameters('audio', extendedRtpCapabilities),
                video: ortc.getSendingRtpParameters('video', extendedRtpCapabilities)
            };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async updateIceServers(iceServers) {
        logger.debug('updateIceServers()');
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async restartIce(iceParameters) {
        logger.debug('restartIce()');
        return;
    }
    async getTransportStats() {
        return new Map(); // NOTE: Whatever.
    }
    async send(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { track, encodings, codecOptions, codec }) {
        logger.debug('send() [kind:%s, track.id:%s]', track.kind, track.id);
        if (!this._transportReady)
            await this._setupTransport({ localDtlsRole: 'server' });
        const rtpParameters = utils.clone(this._rtpParametersByKind[track.kind], {});
        const useRtx = rtpParameters.codecs
            .some((_codec) => /.+\/rtx$/i.test(_codec.mimeType));
        rtpParameters.mid = `mid-${utils.generateRandomNumber()}`;
        if (!encodings)
            encodings = [{}];
        for (const encoding of encodings) {
            encoding.ssrc = utils.generateRandomNumber();
            if (useRtx)
                encoding.rtx = { ssrc: utils.generateRandomNumber() };
        }
        rtpParameters.encodings = encodings;
        // Fill RTCRtpParameters.rtcp.
        rtpParameters.rtcp =
            {
                cname: this._cname,
                reducedSize: true,
                mux: true
            };
        const localId = this._nextLocalId++;
        this._tracks.set(localId, track);
        return { localId: String(localId), rtpParameters };
    }
    async stopSending(localId) {
        logger.debug('stopSending() [localId:%s]', localId);
        if (!this._tracks.has(Number(localId)))
            throw new Error('local track not found');
        this._tracks.delete(Number(localId));
    }
    async replaceTrack(localId, track) {
        if (track) {
            logger.debug('replaceTrack() [localId:%s, track.id:%s]', localId, track.id);
        }
        else {
            logger.debug('replaceTrack() [localId:%s, no track]', localId);
        }
        this._tracks.delete(Number(localId));
        this._tracks.set(Number(localId), track);
    }
    async setMaxSpatialLayer(localId, spatialLayer) {
        logger.debug('setMaxSpatialLayer() [localId:%s, spatialLayer:%s]', localId, spatialLayer);
    }
    async setRtpEncodingParameters(localId, params) {
        logger.debug('setRtpEncodingParameters() [localId:%s, params:%o]', localId, params);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getSenderStats(localId) {
        return new Map(); // NOTE: Whatever.
    }
    async sendDataChannel({ ordered, maxPacketLifeTime, maxRetransmits, label, protocol }) {
        if (!this._transportReady)
            await this._setupTransport({ localDtlsRole: 'server' });
        logger.debug('sendDataChannel()');
        const dataChannel = new FakeDataChannel({
            id: this._nextSctpStreamId++,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            label,
            protocol
        });
        const sctpStreamParameters = {
            streamId: this._nextSctpStreamId,
            ordered: ordered,
            maxPacketLifeTime: maxPacketLifeTime,
            maxRetransmits: maxRetransmits
        };
        // @ts-ignore.
        return { dataChannel, sctpStreamParameters };
    }
    async receive(optionsList) {
        const results = [];
        for (const options of optionsList) {
            const { trackId, kind } = options;
            if (!this._transportReady)
                await this._setupTransport({ localDtlsRole: 'client' });
            logger.debug('receive() [trackId:%s, kind:%s]', trackId, kind);
            const localId = this._nextLocalId++;
            const track = new FakeMediaStreamTrack({ kind });
            this._tracks.set(localId, track);
            results.push({ localId: String(localId), track });
        }
        return results;
    }
    async stopReceiving(localId) {
        logger.debug('stopReceiving() [localId:%s]', localId);
        this._tracks.delete(Number(localId));
    }
    async pauseReceiving(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localIds) {
        // Unimplemented.
    }
    async resumeReceiving(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localIds) {
        // Unimplemented.
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getReceiverStats(localId) {
        return new Map(); //
    }
    async receiveDataChannel({ sctpStreamParameters, label, protocol }) {
        if (!this._transportReady)
            await this._setupTransport({ localDtlsRole: 'client' });
        logger.debug('receiveDataChannel()');
        const dataChannel = new FakeDataChannel({
            id: sctpStreamParameters.streamId,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits,
            label,
            protocol
        });
        // @ts-ignore.
        return { dataChannel };
    }
    async _setupTransport({ localDtlsRole, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localSdpObject }) {
        const dtlsParameters = utils.clone(this.fakeParameters.generateLocalDtlsParameters(), {});
        // Set our DTLS role.
        if (localDtlsRole)
            dtlsParameters.role = localDtlsRole;
        // Assume we are connecting now.
        this.emit('@connectionstatechange', 'connecting');
        // Need to tell the remote transport about our parameters.
        await new Promise((resolve, reject) => (this.emit('@connect', { dtlsParameters }, resolve, reject)));
        this._transportReady = true;
    }
}
