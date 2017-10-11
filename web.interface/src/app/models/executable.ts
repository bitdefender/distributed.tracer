export class Executable {
    id: string;
    name: string;
    platform: string;
    execution: string;
    features: {
        mempatch: boolean,
        corpus: boolean,
        fuzzer: boolean
    }
}
