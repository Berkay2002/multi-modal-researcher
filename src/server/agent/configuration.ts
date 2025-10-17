import type { RunnableConfig } from "@langchain/core/runnables";

export type ConfigurationOptions = {
  searchModel?: string;
  synthesisModel?: string;
  videoModel?: string;
  ttsModel?: string;
  searchTemperature?: number;
  synthesisTemperature?: number;
  podcastScriptTemperature?: number;
  mikeVoice?: string;
  sarahVoice?: string;
  ttsChannels?: number;
  ttsRate?: number;
  ttsSampleWidth?: number;
};

type ResolvedConfigurationOptions = Required<ConfigurationOptions>;
type ConfigurationField = keyof ConfigurationOptions;

const DEFAULTS: ResolvedConfigurationOptions = {
  searchModel: "gemini-flash-latest",
  synthesisModel: "gemini-flash-latest",
  videoModel: "gemini-flash-latest",
  ttsModel: "gemini-2.5-flash-preview-tts",
  searchTemperature: 0,
  synthesisTemperature: 0.3,
  podcastScriptTemperature: 0.4,
  mikeVoice: "Kore",
  sarahVoice: "Puck",
  ttsChannels: 1,
  ttsRate: 24_000,
  ttsSampleWidth: 2,
};

const NUMERIC_FIELDS = [
  "searchTemperature",
  "synthesisTemperature",
  "podcastScriptTemperature",
  "ttsChannels",
  "ttsRate",
  "ttsSampleWidth",
] as const satisfies readonly ConfigurationField[];

const INTEGER_FIELDS = [
  "ttsChannels",
  "ttsRate",
  "ttsSampleWidth",
] as const satisfies readonly ConfigurationField[];

type NumericField = (typeof NUMERIC_FIELDS)[number];
type IntegerField = (typeof INTEGER_FIELDS)[number];

const numericFieldSet = new Set<ConfigurationField>(NUMERIC_FIELDS);
const integerFieldSet = new Set<ConfigurationField>(INTEGER_FIELDS);

const isNumericField = (key: ConfigurationField): key is NumericField =>
  numericFieldSet.has(key);

const isIntegerField = (key: ConfigurationField): key is IntegerField =>
  integerFieldSet.has(key);

const setResolvedValue = <K extends ConfigurationField>(
  target: Partial<ResolvedConfigurationOptions>,
  key: K,
  value: ResolvedConfigurationOptions[K]
) => {
  target[key] = value;
};

/**
 * Utility class mirroring the Python {@code Configuration} dataclass.
 * Values can be provided via constructor arguments, runnable configuration,
 * or environment variables (upper-cased field names).
 */
export class Configuration {
  readonly searchModel: string;
  readonly synthesisModel: string;
  readonly videoModel: string;
  readonly ttsModel: string;
  readonly searchTemperature: number;
  readonly synthesisTemperature: number;
  readonly podcastScriptTemperature: number;
  readonly mikeVoice: string;
  readonly sarahVoice: string;
  readonly ttsChannels: number;
  readonly ttsRate: number;
  readonly ttsSampleWidth: number;

  constructor(options: ConfigurationOptions = {}) {
    const resolved: Required<ConfigurationOptions> = {
      ...DEFAULTS,
      ...options,
    };

    this.searchModel = resolved.searchModel;
    this.synthesisModel = resolved.synthesisModel;
    this.videoModel = resolved.videoModel;
    this.ttsModel = resolved.ttsModel;
    this.searchTemperature = resolved.searchTemperature;
    this.synthesisTemperature = resolved.synthesisTemperature;
    this.podcastScriptTemperature = resolved.podcastScriptTemperature;
    this.mikeVoice = resolved.mikeVoice;
    this.sarahVoice = resolved.sarahVoice;
    this.ttsChannels = resolved.ttsChannels;
    this.ttsRate = resolved.ttsRate;
    this.ttsSampleWidth = resolved.ttsSampleWidth;
  }

  static fromRunnableConfig(
    config?: RunnableConfig<ConfigurationOptions>
  ): Configuration {
    if (!config?.configurable) {
      return Configuration.fromEnvironment();
    }

    const merged = Configuration.collectValues(config.configurable);
    return new Configuration(merged);
  }

  static fromEnvironment(): Configuration {
    const envValues: Partial<ResolvedConfigurationOptions> = {};

    for (const key of Object.keys(DEFAULTS) as ConfigurationField[]) {
      const envKey = key.toUpperCase();
      const raw = process.env[envKey];
      if (raw === undefined) {
        continue;
      }

      setResolvedValue(envValues, key, Configuration.coerceValue(key, raw));
    }

    return new Configuration(envValues);
  }

  private static collectValues(
    configurable: ConfigurationOptions
  ): ConfigurationOptions {
    const values: Partial<ResolvedConfigurationOptions> = {};

    for (const key of Object.keys(DEFAULTS) as ConfigurationField[]) {
      const envKey = key.toUpperCase();
      if (process.env[envKey] !== undefined) {
        setResolvedValue(
          values,
          key,
          Configuration.coerceValue(key, process.env[envKey] as string)
        );
        continue;
      }

      const maybeValue = configurable[key];
      if (maybeValue === undefined) {
        continue;
      }

      setResolvedValue(values, key, Configuration.coerceValue(key, maybeValue));
    }

    return values;
  }

  private static coerceValue(
    key: ConfigurationField,
    value: unknown
  ): ResolvedConfigurationOptions[ConfigurationField] {
    if (value === undefined || value === null) {
      return DEFAULTS[key];
    }

    if (!isNumericField(key)) {
      return String(value);
    }

    if (typeof value === "number") {
      return (
        isIntegerField(key) ? Math.trunc(value) : value
      ) as ResolvedConfigurationOptions[ConfigurationField];
    }

    if (isIntegerField(key)) {
      const parsedInt = Number.parseInt(String(value), 10);
      return (
        Number.isNaN(parsedInt) ? DEFAULTS[key] : parsedInt
      ) as ResolvedConfigurationOptions[ConfigurationField];
    }

    const parsedFloat = Number.parseFloat(String(value));
    return (
      Number.isFinite(parsedFloat) ? parsedFloat : DEFAULTS[key]
    ) as ResolvedConfigurationOptions[ConfigurationField];
  }
}
