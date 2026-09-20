#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import { open, readFile, rename, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createNonPlanningManifest } from "./live-review-source-set.mjs";
import { canonicalJson, sha256Hex } from "./audit-live-readiness.mjs";

const hash = /^[0-9a-f]{64}$/u;
const commit = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
const schemas = new Map([
  ["evidencelens.source.v2", new Set(["ready"])],
  ["evidencelens.deep-review.v2", new Set(["ready"])],
  ["evidencelens.asvs-review.v2", new Set(["ready"])],
  ["evidencelens.build.v2", new Set(["ready", "preflight_failed", "build_failed", "verification_failed"])],
  ["evidencelens.diagnostic.v2", new Set(["passed", "diagnostic_failed", "preflight_failed", "request_failed", "timeout", "protocol_failed", "disclosure", "malformed", "abnormal_close", "blocked_by_build"])],
  ["evidencelens.execution.v2", new Set(["passed", "gaps_found"])],
  ["evidencelens.repair.v2", new Set(["not_required", "ready", "blocked"])],
]);
const keys = ["certifier_sha256", "manifest_sha256", "non_planning_tree", "reviewed_commit", "schema", "status"];
const proofKeys = [...keys, "build_sha256", "clean_exit", "execution_sha256", "finding_count", "fixture_count", "outcome", "review_sha256", "security_sha256", "source_sha256"];
const nonPassOutcomes = new Set(["diagnostic_failed", "preflight_failed", "review_failed", "build_failed", "request_failed", "timeout", "protocol_failed", "disclosure", "malformed", "abnormal_close"]);
const execFileAsync = promisify(execFile);
const repairNames = ["10-30-REPAIR.json", "10-31-REPAIR.json", "10-32-REPAIR.json", "10-33-REPAIR.json"];
const phase = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e";
const consumedStateCommit = "1b62227f8c38b12a8c287f670d9300241a11686b";
const consumedStatePath = `${phase}/.10-51-live-state.json`;
const unavailable = "unavailable_from_committed_state";
const mode = (paths, schemas, committed = false) => Object.freeze({
  paths: Object.freeze(paths.map((name) => `${phase}/${name}`)),
  schemas: Object.freeze(schemas),
  committed,
});

const legacyConsumedLivePath = `${phase}/10-62-CONSUMED-LIVE.json`;
const priorConsumedLivePath = `${phase}/10-67-CONSUMED-LIVE.json`;
const priorCurrentConsumedLivePath = `${phase}/10-72-CONSUMED-LIVE.json`;
const previousLatestConsumedLivePath = `${phase}/10-77-CONSUMED-LIVE.json`;
const previousNewestConsumedLivePath = `${phase}/10-82-CONSUMED-LIVE.json`;
const previousConsumedLivePath = `${phase}/10-87-CONSUMED-LIVE.json`;
const recoveredConsumedLivePath = `${phase}/10-92-CONSUMED-LIVE.json`;
const previousProtocolConsumedLivePath = `${phase}/10-97-CONSUMED-LIVE.json`;
const postFetchConsumedLivePath = `${phase}/10-102-CONSUMED-LIVE.json`;
const diagnosticCapabilityConsumedLivePath = `${phase}/10-107-CONSUMED-LIVE.json`;
const boundedJsonConsumedLivePath = `${phase}/10-117-CONSUMED-LIVE.json`;
const extractionDiagnosticConsumedLivePath = `${phase}/10-122-CONSUMED-LIVE.json`;
const authenticatedDiagnosticConsumedLivePath = `${phase}/10-127-CONSUMED-LIVE.json`;
const singletonArrayConsumedLivePath = `${phase}/10-132-CONSUMED-LIVE.json`;
const inertProseBracketConsumedLivePath = `${phase}/10-137-CONSUMED-LIVE.json`;
const finishReasonConsumedLivePath = `${phase}/10-142-CONSUMED-LIVE.json`;
const promptV2ConsumedLivePath = `${phase}/10-147-CONSUMED-LIVE.json`;
const certifiedOutputConsumedLivePath = `${phase}/10-152-CONSUMED-LIVE.json`;
const consumedLivePath = `${phase}/10-112-CONSUMED-LIVE.json`;
const localValidationPath = `${phase}/10-155-LOCAL-VALIDATION.json`;
const forensicPath = certifiedOutputConsumedLivePath;
const transitionPath = `${phase}/10-155-TRANSITION.json`;
const executionPath = `${phase}/10-155-EXECUTION.json`;
const proofPath = `${phase}/10-155-PROOF.json`;
const sourcePath = `${phase}/10-153-SOURCE.json`;
const reviewPath = `${phase}/10-153-REVIEW.md`;
const securityPath = `${phase}/10-153-SECURITY.md`;
const buildPath = `${phase}/10-154-FINAL-BUILD.json`;
const legacyConsumedLiveCommit = "585fd01622ec7964cd72d0180847383f61757901";
const legacyConsumedLiveGeneration = "4de25b800d261e98344860f45de900ba852679671cac0aaefeef9d27dc488f65";
const legacyConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-59-live-state.json`, sha256: "e643c3cd6a952f92984aff2f8fc5d787cfed5d5e30dc689836bf7144e079008b" }),
  terminal: Object.freeze({ path: `${phase}/.10-59-terminal-snapshot.json`, sha256: "7114aeaa6705af340a02be6dca4a109a3ac63b9b7276d2eee2c17c269309f1c7" }),
  claim: Object.freeze({ path: `${phase}/.10-59-terminal-snapshot.json.claim`, sha256: "594d227593503d45a762861bae087220b925ba4e942b6662792bd660a4ac0b9a" }),
  transition: Object.freeze({ path: `${phase}/10-59-TRANSITION.json`, sha256: "0863f2868cbce68d4e322533f5fbab4e7c1b4a06f4da1bfbd5b0164e03d26545" }),
  execution: Object.freeze({ path: `${phase}/10-59-EXECUTION.json`, sha256: "eaa3e09b77489caedeb6864ed3f67843d1e7d3d5e05bcce7f647173f943f364c" }),
  proof: Object.freeze({ path: `${phase}/10-59-PROOF.json`, sha256: "48285129a2b75e5ae0ca03c1252b31295884a84cc9bd6f075a8672c7c6341711" }),
  local_validation: Object.freeze({ path: `${phase}/10-59-LOCAL-VALIDATION.json`, sha256: "4dc6ea01b98ff61d1573cebd54192dfa026b433915f4c0830734a779fc0a3926" }),
});
const consumedLiveCommit = "b7573aa06ff131855e78809847563f8ba6cfe624";
const consumedLiveGeneration = "0f9f862325bd28b0a21da955621e7cd0b064b88ee1d9ba931580c18c4ec7ccf6";
const consumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-65-live-state.json`, sha256: "101ad2c1e4fa6a416247f5a8c94cc6cf1e8072595692406723fb26f16fd14b11" }),
  terminal: Object.freeze({ path: `${phase}/.10-65-terminal-snapshot.json`, sha256: "135cbaa1d8414cca848653ea014c65ae6ad97a3cda3ddb5267595649e4891952" }),
  claim: Object.freeze({ path: `${phase}/.10-65-terminal-snapshot.json.claim`, sha256: "55b430235ac58ceb8d3b7f2de005ac4e0257eba858aaea1e218e5fbe1282cd16" }),
  transition: Object.freeze({ path: `${phase}/10-65-TRANSITION.json`, sha256: "8cfbcef191c12e7b20c47c4f2793d0c272ca29a6f5786aa7069d7876586d5063" }),
  execution: Object.freeze({ path: `${phase}/10-65-EXECUTION.json`, sha256: "0c81182fc62bdadb594de7f2b6ad9c47a9a132808e0f4628d71659edd0de65ea" }),
  proof: Object.freeze({ path: `${phase}/10-65-PROOF.json`, sha256: "3a36b63d9a3cd93e1462d8a531061b84be9ccef18f56b2a10de05168a146a163" }),
  local_validation: Object.freeze({ path: `${phase}/10-65-LOCAL-VALIDATION.json`, sha256: "36e9000c5fbcd9535b68730ee65b19d7ab2e1ed0c795c717ff78fe54de9632e1" }),
});
const currentConsumedLiveCommit = "95dcbef2e0f525b1380f0f303aee096e68c911e5";
const currentConsumedLiveGeneration = "3767fe38a51a1e27932064af0859c135138a1e4267a018ba86c81167cd96c6bb";
const currentConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-70-live-state.json`, sha256: "c4bd00de921ac81a0c2cdc98b68a070aec9835d953f7acbd27b29f63fc5ff970" }),
  terminal: Object.freeze({ path: `${phase}/.10-70-terminal-snapshot.json`, sha256: "873667367cd808726c49b2f191f7e38c60d4a50c1c89642239440759cdf59103" }),
  claim: Object.freeze({ path: `${phase}/.10-70-terminal-snapshot.json.claim`, sha256: "7163c77aec4bcb438e57e989932681ef2cf53763d3802b0679940e512d63eaa6" }),
  transition: Object.freeze({ path: `${phase}/10-70-TRANSITION.json`, sha256: "e9cec2fbc647f1a168989ef7da61573dcfee7788e3e8fd6694a13788313e97dc" }),
  execution: Object.freeze({ path: `${phase}/10-70-EXECUTION.json`, sha256: "d270df564fa6b360c488aadab7b4f8b98fce553cd19f8ae355d5979fef8e90dc" }),
  proof: Object.freeze({ path: `${phase}/10-70-PROOF.json`, sha256: "2c701fdeed90d7e8e738b67c01410242c0b9ee949bde592ef88d65c70e7323d4" }),
  local_validation: Object.freeze({ path: `${phase}/10-70-LOCAL-VALIDATION.json`, sha256: "aa557953d0899ac5c6b1c39a48d4782181c1df8f29ac531e354b9c1b76ab8b31" }),
});
const latestConsumedLiveCommit = "cc35eae632661e50ff641fadad3ee8af24c2776f";
const latestConsumedLiveGeneration = "21c4e3fecc07c196cab364d870d8520321ae5d7ad15c33314eb15cf036d9f9b6";
const latestConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-75-live-state.json`, sha256: "95b584016c76ddb6d4135181c995173209668335de500f4f2093a74e4c2bc98a" }),
  terminal: Object.freeze({ path: `${phase}/.10-75-terminal-snapshot.json`, sha256: "30f456a4f5df031eb1ac9d870ba1d9d6f01a5ef128f8c60b8f3c69bc4b002f5d" }),
  claim: Object.freeze({ path: `${phase}/.10-75-terminal-snapshot.json.claim`, sha256: "0aaff8996a3efa9ee6982254920cc1f60acc3c82606900abaab070d2788fbb13" }),
  transition: Object.freeze({ path: `${phase}/10-75-TRANSITION.json`, sha256: "5b8a3e818a17e8f3817e3a4f9638b9383a7fcfecabf8c58200bf87c717a3bfa7" }),
  execution: Object.freeze({ path: `${phase}/10-75-EXECUTION.json`, sha256: "a816d64633cd378268e38f5704f076e678db726e29769bffbddfc8546f690045" }),
  proof: Object.freeze({ path: `${phase}/10-75-PROOF.json`, sha256: "d9fa36f7d48a966a0c5d64b2af21b567e4c58bd40d8688cf4c32aa9683e7648b" }),
  local_validation: Object.freeze({ path: `${phase}/10-75-LOCAL-VALIDATION.json`, sha256: "27937e46fc8a882cc83c2fac3ca4c79e12994d1c3416d5e09139053e8b0bc569" }),
});
const previousNewestConsumedLiveCommit = "ef53b714bcbe2225c5c79d8146929eb2d78b3dfe";
const previousNewestConsumedLiveGeneration = "15d6e9cc11282504d9b9feafeaddeced0522ccd3273ef7dfb5eb968cfe7a4011";
const previousNewestConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-80-live-state.json`, sha256: "7925db5121d0351dadd6cf90fe0afd50dd594ce9dc4e691f2ac76f9a15463edb" }),
  terminal: Object.freeze({ path: `${phase}/.10-80-terminal-snapshot.json`, sha256: "b87b17bb22aedfca71316a92f033dd4e961c2f3ff55779a8f9558a183c6c6cf0" }),
  claim: Object.freeze({ path: `${phase}/.10-80-terminal-snapshot.json.claim`, sha256: "56b315a0743c4bde62fcabedddb12fc28e72c42af555a2a5a890ec2f80e9e703" }),
  transition: Object.freeze({ path: `${phase}/10-80-TRANSITION.json`, sha256: "9a911c193b6ae3b57bb7f8e9b5d679f7709ae62eaf601ad62092bfbfc99b026f" }),
  execution: Object.freeze({ path: `${phase}/10-80-EXECUTION.json`, sha256: "83aab2b4635496b2a4801958762dc8dbdd25568ef1f21d9b9e165cb40142e270" }),
  proof: Object.freeze({ path: `${phase}/10-80-PROOF.json`, sha256: "aea669742499a2ddfce940c96c8824c95e6da1ebd97cbc59386bfbb42b94f4d9" }),
  local_validation: Object.freeze({ path: `${phase}/10-80-LOCAL-VALIDATION.json`, sha256: "20e1b83f43d0d033e14529633e200b76f3b197de30f8fd7e0dbf74187227ff8a" }),
});
const newestConsumedLiveCommit = "b9593fe47ec13432b132e59fb06613fb53be8ed9";
const newestConsumedLiveGeneration = "b8bb4ddb586f72216d62f966f2fbd83d0f730aff60426141e9c46fb021c0dd82";
const newestConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-85-live-state.json`, sha256: "fe686097c30e284b89098a074ebe50e8b0fc8b32b9f3b5f16a38fada162eb6eb" }),
  terminal: Object.freeze({ path: `${phase}/.10-85-terminal-snapshot.json`, sha256: "9368d959319ccba4cfdc8415fc1984ca7f4014fbf585ebbedcfdc0a9736c03ac" }),
  claim: Object.freeze({ path: `${phase}/.10-85-terminal-snapshot.json.claim`, sha256: "8931a8f43a2fae8ab9a823bb44c90213bfbba525d7caca94e338ada43473347f" }),
  transition: Object.freeze({ path: `${phase}/10-85-TRANSITION.json`, sha256: "b81362fa14ac8cb19de266bbee95efae25203f82befdef4f08bedf729b89578e" }),
  execution: Object.freeze({ path: `${phase}/10-85-EXECUTION.json`, sha256: "ecd3870ebd3219f2796886541359c7252b8e53ef88614de4f6b9c8283f3f4b63" }),
  proof: Object.freeze({ path: `${phase}/10-85-PROOF.json`, sha256: "d7b864a3a0aa560815f841c88c317e5210d83679918abdd7ee4bfbbe1efb312d" }),
  local_validation: Object.freeze({ path: `${phase}/10-85-LOCAL-VALIDATION.json`, sha256: "726f7c9d5e80a14e7e003bcef7cb85a6ec01379706c280880bb1fb320204dc3a" }),
});
const recoveredConsumedLiveCommit = "772d9fbc343b16ec188a50e362edcd8f4ddf4dbc";
const recoveredConsumedLiveGeneration = "57b76915cb7b94b1005e07b381a170109119a22cd4407e0692f4d6aa126cad74";
const recoveredConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-90-live-state.json`, sha256: "db71b22f8ff503df5cdde80a8f8b216cbe5b542b4a74063675a66a2204ce52f0" }),
  terminal: Object.freeze({ path: `${phase}/.10-90-terminal-snapshot.json`, sha256: "33410a9bc330a7883f5bb5088485b0fd64faf1eb80f0eef52b9e94ae2b90ce6d" }),
  claim: Object.freeze({ path: `${phase}/.10-90-terminal-snapshot.json.claim`, sha256: "6ef02e68d3a300c1feed144b9e0cfb33dcd371538986f3b56b72db64f37c9bf4" }),
  transition: Object.freeze({ path: `${phase}/10-90-TRANSITION.json`, sha256: "7ecb40074f12f54bbab6aeeeba1e1d919f4d78fa8809b70f5069d03b64a39e54" }),
  execution: Object.freeze({ path: `${phase}/10-90-EXECUTION.json`, sha256: "5cbc5a66af08c538599d31de4b2e54e14f9a3686d8f4fffdff3c4c3186a08536" }),
  proof: Object.freeze({ path: `${phase}/10-90-PROOF.json`, sha256: "09c13fb16cb87f325ab419708676519ded3389a94fcfac0c809fe15c1b93064c" }),
  local_validation: Object.freeze({ path: `${phase}/10-90-LOCAL-VALIDATION.json`, sha256: "463add3a7cb2a7b839d50b2efb63e51ddaefcfa8ec2f81c500d167cecd9d4287" }),
});
const protocolConsumedLiveCommit = "d86fd07c166178dcc78ef7b31d9b55f5fbbc986b";
const protocolConsumedLiveGeneration = "c482938a3ebd8a0edd2486c2863dc30274843d2d43d8eda336ff40aa8aac3a9c";
const protocolConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-95-live-state.json`, sha256: "b3983f634287693a0b3cde6f15b534cb63b4320407687d8f7fbc8bb0cbbe7524" }),
  terminal: Object.freeze({ path: `${phase}/.10-95-terminal-snapshot.json`, sha256: "530637eb13fe68ef65138ddc960450a6916a2cd78e5ba0bba1a05ebe63ec2d30" }),
  claim: Object.freeze({ path: `${phase}/.10-95-terminal-snapshot.json.claim`, sha256: "252bbd6b25b1ed08b4ebea91d388f00448c4da9edf45ebc05d7f68542c243777" }),
  transition: Object.freeze({ path: `${phase}/10-95-TRANSITION.json`, sha256: "e0ff300d37b1ebdc5064587931270667ec6dcae2c806c4f9f26c1894569cc246" }),
  execution: Object.freeze({ path: `${phase}/10-95-EXECUTION.json`, sha256: "65c7e66ee66516a16d2763eed89910544501e6bb6d9ff7a153e58f415e509c91" }),
  proof: Object.freeze({ path: `${phase}/10-95-PROOF.json`, sha256: "2a6e35fce22d0641aebe75e9b70ab9c10ec77d87796eff260a9a558277f7b605" }),
  local_validation: Object.freeze({ path: `${phase}/10-95-LOCAL-VALIDATION.json`, sha256: "9d1ff3eb91b96b672820ab5167241d86222b609bc454967bb8f748567be6b96c" }),
});
const postFetchConsumedLiveCommit = "a2d76d9de4e7055c56040d2afd11c54db07ffb34";
const postFetchConsumedLiveGeneration = "82a9877588679d9b60df4d728dffc1d3f153acc02ee670d668f886e654ac9bd9";
const postFetchConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-100-live-state.json`, sha256: "cf2ee64b6bf2f79e7a230cdca4a6321afb4fb9813429d5f3acb06b77123faaad" }),
  terminal: Object.freeze({ path: `${phase}/.10-100-terminal-snapshot.json`, sha256: "d838095307bff3320ee740077de944426b40f652072f3f54a7c20954b6db1a75" }),
  claim: Object.freeze({ path: `${phase}/.10-100-terminal-snapshot.json.claim`, sha256: "9872d216c915bf0e62dc28f39f6aa45147817023ef0537008aff1827076b4ada" }),
  transition: Object.freeze({ path: `${phase}/10-100-TRANSITION.json`, sha256: "c8d4984fd4c8b05d2d18fc63dc095ab3f72d371f1f57da9252e78f705e8d7d9b" }),
  execution: Object.freeze({ path: `${phase}/10-100-EXECUTION.json`, sha256: "833b4b4c2af0a2a57d23b7afb27a23106e938fa9a015d92e0ec3db6c1d76f853" }),
  proof: Object.freeze({ path: `${phase}/10-100-PROOF.json`, sha256: "b6b0bff63854050c241eeb23c6c11e67bc18f96de5c034044a8dff1e3dea5c0c" }),
  local_validation: Object.freeze({ path: `${phase}/10-100-LOCAL-VALIDATION.json`, sha256: "10587eb3f87c1b69fb9b11843462549b4a4ce6da73ac3cced7089cb06861cb4c" }),
});
const diagnosticCapabilityConsumedLiveCommit = "3b4c09d522a099413c591dd25a723b978cd2d0d4";
const diagnosticCapabilityConsumedLiveGeneration = "c9cd25040f399bb6f9b531ecea2a6c9713d6821c51778ecb353450155ef3fea0";
const diagnosticCapabilityConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-105-live-state.json`, sha256: "4946d3142380251de37c9664b8cabc28047097f444ae4e43770477dab01d378e" }),
  terminal: Object.freeze({ path: `${phase}/.10-105-terminal-snapshot.json`, sha256: "245f78d212e36b694223b90cf2f95db1edfdd7f459ea98832d1aeb387342a46b" }),
  claim: Object.freeze({ path: `${phase}/.10-105-terminal-snapshot.json.claim`, sha256: "ae501f8ff7e0a1950a4014eb2d4a5439bebbdf2e945ce786a56736077f86bca3" }),
  transition: Object.freeze({ path: `${phase}/10-105-TRANSITION.json`, sha256: "10a23e5fd1e1f76f8368bc611d6ee7d943085fd8446400bd6a34c1d950b158a8" }),
  execution: Object.freeze({ path: `${phase}/10-105-EXECUTION.json`, sha256: "536db6cca400fe3a3b8d2dd229a4d3a4d6692269f7589fdb0d3d832ec13f6178" }),
  proof: Object.freeze({ path: `${phase}/10-105-PROOF.json`, sha256: "8c8f669467c31da233fa180e4185c4ee106e9ac47ae485baeac54e103fc07f46" }),
  local_validation: Object.freeze({ path: `${phase}/10-105-LOCAL-VALIDATION.json`, sha256: "7ebd5546cbbe487a774887375f7e5e08cecea527ac127ddbd6c34986080b9150" }),
});
const immutableImageConsumedLiveCommit = "df4290bdbff3901b3e50a23a3ae8a7949c24a0b4";
const immutableImageConsumedLiveGeneration = "30f0d9b28c13132e1a79ce6a3afe0f1a9fdd457867e47e67ded8c3a547b83e73";
const immutableImageConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-110-live-state.json`, sha256: "c9e3a03102a62961857e4a8dcba684a7beff3457775263f7bee2f8e8879f2e17" }),
  terminal: Object.freeze({ path: `${phase}/.10-110-terminal-snapshot.json`, sha256: "70406364595d017dd59091024df6600e852cb7590c03c14c2478a466a7778cdb" }),
  claim: Object.freeze({ path: `${phase}/.10-110-terminal-snapshot.json.claim`, sha256: "134351336385d76a46ec1404e1cba9d9b05ea00f44f92cf5531ed4c36fbf78a6" }),
  transition: Object.freeze({ path: `${phase}/10-110-TRANSITION.json`, sha256: "b90aadf6bb96b64f27ec8dd024a4c4db25209360ed4857c75e049428dca54c96" }),
  execution: Object.freeze({ path: `${phase}/10-110-EXECUTION.json`, sha256: "465dcbf77d75ce5eff80e9c56df10cda4d27bf38317806f3859c2ffb9a4b08d0" }),
  proof: Object.freeze({ path: `${phase}/10-110-PROOF.json`, sha256: "940af0de8ca762caec65feaadf46b59b1d41a890d88835ffb5e7312ecbb50243" }),
  local_validation: Object.freeze({ path: `${phase}/10-110-LOCAL-VALIDATION.json`, sha256: "33626d9e36874c71937ab918fc98b8edbc3a8e48fc897fe1c3720aa85592798a" }),
});
const boundedJsonConsumedLiveCommit = "3e77c46e453eeabef2d6cc33fa7d2a21071c1aff";
const boundedJsonConsumedLiveGeneration = "add65ba8f2afce20550cc881f0560c5c7805c73654983469e62a65cc22c58f1f";
const boundedJsonConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-115-live-state.json`, sha256: "f300d8d2b1e108f6a748c4116c2bf0d2baef9a5e253043d662e5e21c43be8e28" }),
  terminal: Object.freeze({ path: `${phase}/.10-115-terminal-snapshot.json`, sha256: "4b81bd15dcca77f0abf140490524effbe34731464f0711e5453d38540d66c414" }),
  claim: Object.freeze({ path: `${phase}/.10-115-terminal-snapshot.json.claim`, sha256: "8791f63ad53fdacef8aa24fa6aea0ce158827d6924f0715bc7ae8639f9733291" }),
  transition: Object.freeze({ path: `${phase}/10-115-TRANSITION.json`, sha256: "864bb3c581b33f5dfac8ef510fdcf48b872e628779277edd945909520d45da5a" }),
  execution: Object.freeze({ path: `${phase}/10-115-EXECUTION.json`, sha256: "ddfaf13e1433ea09a720f2592178cebb9f1cd33f5be68b13fb226a97635005f1" }),
  proof: Object.freeze({ path: `${phase}/10-115-PROOF.json`, sha256: "d8f038cdbc96d2e384d142640a81dfb7b7c300e742186afb75cac23adfc20f3a" }),
  local_validation: Object.freeze({ path: `${phase}/10-115-LOCAL-VALIDATION.json`, sha256: "b7f7821eaeea2732d8f4726885373ca0dd7d134b49b450c1e12eb3837a3197ad" }),
});
const extractionDiagnosticConsumedLiveCommit = "5d52505e99e42d39e55ea599dceaaf4a80c73f8c";
const extractionDiagnosticConsumedLiveGeneration = "3d1a7751bbab378437bca30943ef360913c79d1f68b63423e4201d8d4c312a8d";
const extractionDiagnosticConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-120-live-state.json`, sha256: "c0fe9de0e00d1b0cc6eac559b99fac831ab7b6fea820755e97978a8f49a5eaec" }),
  terminal: Object.freeze({ path: `${phase}/.10-120-terminal-snapshot.json`, sha256: "2ae85053c7e176b8e02a90aae94f286eb900ba531bbe4d32a9b1e20b9b960ff2" }),
  claim: Object.freeze({ path: `${phase}/.10-120-terminal-snapshot.json.claim`, sha256: "b09c6b52901486e3f194d3631cdc87098e8806bf2fe67479a287f084d1d29c96" }),
  transition: Object.freeze({ path: `${phase}/10-120-TRANSITION.json`, sha256: "ebddaa8ef2d9bc95c870ae02ec13da438f39b9cf531d4206e12d922358109c54" }),
  execution: Object.freeze({ path: `${phase}/10-120-EXECUTION.json`, sha256: "8b2178d58089a6d18d253330daf9b04b56a6f99a8184f9a592e371b26aac7e33" }),
  proof: Object.freeze({ path: `${phase}/10-120-PROOF.json`, sha256: "f3890a3d85131f5c33202af2467fef9720359d0cf305f2dbb05c31e9eca49339" }),
  local_validation: Object.freeze({ path: `${phase}/10-120-LOCAL-VALIDATION.json`, sha256: "814b9f22a8f602726dceee8d0e526afcc30f542a877e9953930042edc034ef16" }),
});
const authenticatedDiagnosticConsumedLiveCommit = "047cd2d58d8446fc48380f91ed2ad78ded741070";
const authenticatedDiagnosticConsumedLiveGeneration = "67a9af179734906c98d1800dbaf86eb1af676bade55813adb58121e025d0cf79";
const authenticatedDiagnosticConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-125-live-state.json`, sha256: "50f2e95b8415e4b04a84a321733a22286d375770ad45c1c1b4cec1dfc8b8ba05" }),
  terminal: Object.freeze({ path: `${phase}/.10-125-terminal-snapshot.json`, sha256: "eb748cfcbee34b134f9b9196f4c023df7d11f78d8fe209c0f191714cd863cbb8" }),
  claim: Object.freeze({ path: `${phase}/.10-125-terminal-snapshot.json.claim`, sha256: "1e7a6fae168754865d79cb8418efe907db0dfa6c6d0592632a6c41d8a6f6f2cc" }),
  transition: Object.freeze({ path: `${phase}/10-125-TRANSITION.json`, sha256: "243118024cacaaa187bb36e338f0afcb8aad8ad740546dcedb901282f909e802" }),
  execution: Object.freeze({ path: `${phase}/10-125-EXECUTION.json`, sha256: "0c166535db73e359910151621e459ad85b2901ac5756c6a6fd85054880f826e3" }),
  proof: Object.freeze({ path: `${phase}/10-125-PROOF.json`, sha256: "93e468d41a4e7d8f8b9d94f862f30109f475a3e2345f86dc088b38f094609590" }),
  local_validation: Object.freeze({ path: `${phase}/10-125-LOCAL-VALIDATION.json`, sha256: "cd882f68ccc8719fc7a742164f30a9663f6605136fc924fafe8761e4149625da" }),
});
const singletonArrayConsumedLiveCommit = "1d74037c95fc329098ea90b89e95176667424c1a";
const singletonArrayConsumedLiveGeneration = "ad6979613da6f3fb038d1ab6b9d7066c571d75ade1ca28d891b865147158398d";
const singletonArrayConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-130-live-state.json`, sha256: "da79a2db6548796ff532c39dfadd24d65af7513517ff2a64284485651fb4281e" }),
  terminal: Object.freeze({ path: `${phase}/.10-130-terminal-snapshot.json`, sha256: "d2a9f601703be4cf422a04b701ab5cfa36e5be57674b28b2953933c2336d8545" }),
  claim: Object.freeze({ path: `${phase}/.10-130-terminal-snapshot.json.claim`, sha256: "abb42cfcaafe3160840fcb0ca50646807b3d1cbdb34c56f51711b75c58c7d67c" }),
  transition: Object.freeze({ path: `${phase}/10-130-TRANSITION.json`, sha256: "b129263fb13c342fde8edb741ed6b70598afaaff2ead3f3260bf0659a72192ca" }),
  execution: Object.freeze({ path: `${phase}/10-130-EXECUTION.json`, sha256: "66ee3e529d908929beecb4bbd78c1e4d122405a20568154123fe4a419a7cffab" }),
  proof: Object.freeze({ path: `${phase}/10-130-PROOF.json`, sha256: "09fcf60dca936b133d980c1b5aee5c3aad070a1094bf3cba1f7c23102da4ea72" }),
  local_validation: Object.freeze({ path: `${phase}/10-130-LOCAL-VALIDATION.json`, sha256: "5a8fca41085d6961f26f3e276af29159e77d0d8b9cb9648db890b0723c5bf491" }),
});
const inertProseBracketConsumedLiveCommit = "909f0658e5245daca8541b08681891a7ca1faa57";
const inertProseBracketConsumedLiveGeneration = "7f200433f714be66d4ef181b8d263204d091cb868ae2609a98baeebe4e9f4fb4";
const inertProseBracketConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-135-live-state.json`, sha256: "a9f7e0c8b97e14fe1bfae4177107789952ce5b8fea09035a8effa6645fcd1757" }),
  terminal: Object.freeze({ path: `${phase}/.10-135-terminal-snapshot.json`, sha256: "d9c6323fb3963f375dc493a850e6b95d29b5347519af89c2db6838d930f44df7" }),
  claim: Object.freeze({ path: `${phase}/.10-135-terminal-snapshot.json.claim`, sha256: "59df9d7d484dbfeefc67fa9358ced36cf1f71161a753924ae5432967e92ccddc" }),
  transition: Object.freeze({ path: `${phase}/10-135-TRANSITION.json`, sha256: "67eef20692274593b7636c0195edadac086c8f84f404a008c2f905dc849b508f" }),
  execution: Object.freeze({ path: `${phase}/10-135-EXECUTION.json`, sha256: "fc880c6ed0e063377a38b6b3e56a9ae765a527be6dbb43046763f1a746093d90" }),
  proof: Object.freeze({ path: `${phase}/10-135-PROOF.json`, sha256: "e907e80d3afaddcf9f22ef3c9b89b1e7157d90c3592fea13f6a9e9401cf1f9b3" }),
  local_validation: Object.freeze({ path: `${phase}/10-135-LOCAL-VALIDATION.json`, sha256: "f84149a4b7f7474efdfb8b72606f7e7a081c6370d28bc9dbbf5ebcbc83fef006" }),
});
const finishReasonConsumedLiveCommit = "85b6e886070f4fccfb4ec6172ce35957f2606e9b";
const finishReasonConsumedLiveGeneration = "0ffde51b1141461d820e3737ab940c30bbb0f335e79ed4c07f3a1e4caa10c87d";
const finishReasonConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-140-live-state.json`, sha256: "4e120e7eb1034d6e4f7bc376ab93974f7e4f1f134abffc9c8fc2680926a01425" }),
  terminal: Object.freeze({ path: `${phase}/.10-140-terminal-snapshot.json`, sha256: "3be2d224df4634c31896eaab428656101de2c6c9a5204e54364ca3b59af43b8d" }),
  claim: Object.freeze({ path: `${phase}/.10-140-terminal-snapshot.json.claim`, sha256: "b5b945807ba5d16bb5f3e6342361900a54e189b4714d342173794c929b364173" }),
  transition: Object.freeze({ path: `${phase}/10-140-TRANSITION.json`, sha256: "1058f35f41a5b03c12be53d1bf7540447ecbb07490ae214fce4c95298806b19d" }),
  execution: Object.freeze({ path: `${phase}/10-140-EXECUTION.json`, sha256: "d740b0fa41cb7a2b15394a8ce7143a5174f7241881b6ce7b0f04dabc57c4f12d" }),
  proof: Object.freeze({ path: `${phase}/10-140-PROOF.json`, sha256: "dd806dbe78fd56507707f859d189fb438c70ff14c3e86494d3abc22867be426c" }),
  local_validation: Object.freeze({ path: `${phase}/10-140-LOCAL-VALIDATION.json`, sha256: "6a2aabe81b4523ab157ebf3c684ca287abfad245215089fd93251b014bc50464" }),
});
const promptV2ConsumedLiveCommit = "7db43002d38c1105f18f9346881cbd327498648d";
const promptV2ConsumedLiveGeneration = "7c0ee397e08639d2adfcab215aa3add9a8622be835ef9e900b3427d87e7ca34e";
const promptV2ConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-145-live-state.json`, sha256: "b0c21d0df914cd9de92c545ffe5a954677f647de72e3c2e2ca6ad8ae980472dd" }),
  terminal: Object.freeze({ path: `${phase}/.10-145-terminal-snapshot.json`, sha256: "27a348bb090934ab78e31a32750ab44112415a1de089bcc92453e92dbe808d5f" }),
  claim: Object.freeze({ path: `${phase}/.10-145-terminal-snapshot.json.claim`, sha256: "757e72b0e36f9155a2341fb716805506e839e9be86f86e164e8e597735c15fed" }),
  transition: Object.freeze({ path: `${phase}/10-145-TRANSITION.json`, sha256: "379d79e72c9af63d13e64549687094d2e16434673fff284adaa78672ab25c01e" }),
  execution: Object.freeze({ path: `${phase}/10-145-EXECUTION.json`, sha256: "bc98ccffe8b43bb678979ca1f23288a3931daa8029dd2d40a831ce1e7fcb2a70" }),
  proof: Object.freeze({ path: `${phase}/10-145-PROOF.json`, sha256: "dd4095c0c97417135f4014a25434b99e149fc366b4c33eec7fa55b08c3ae79a3" }),
  local_validation: Object.freeze({ path: `${phase}/10-145-LOCAL-VALIDATION.json`, sha256: "53b413ad60dbda5fe75968e4364085e68723aa95cdfd029b16eec97b5f01d45d" }),
});
const certifiedOutputConsumedLiveCommit = "cd004603a9f1a6279cb7f7be17175a30b6034358";
const certifiedOutputConsumedLiveGeneration = "86a962dbfa4abe5f13e15796df4ebf333d7080f8f9886fa7b5bf2853f9ef4c0e";
const certifiedOutputConsumedLiveFiles = Object.freeze({
  state: Object.freeze({ path: `${phase}/.10-150-live-state.json`, sha256: "8257252dd7bbdc93602284e32c7246bdcee36abc84161ad008afbad1cc30a7b6" }),
  terminal: Object.freeze({ path: `${phase}/.10-150-terminal-snapshot.json`, sha256: "38b04e68fc93b5292905b7026cc2d6847b95378d4cb07a64f4eac037ebded863" }),
  claim: Object.freeze({ path: `${phase}/.10-150-terminal-snapshot.json.claim`, sha256: "a4118d94c991ff6293bb3843a5749addab1528050a527d9bd4e4a0b84afb0057" }),
  transition: Object.freeze({ path: `${phase}/10-150-TRANSITION.json`, sha256: "45f6df871c0a5991304913075a13a79bb979c40d8779c2053901af590cef317f" }),
  execution: Object.freeze({ path: `${phase}/10-150-EXECUTION.json`, sha256: "d26cfc6d3a1de2757e84f78cf1c7523ac590404bdd27dc27209a1fd08ece7840" }),
  proof: Object.freeze({ path: `${phase}/10-150-PROOF.json`, sha256: "faceb9e98cddd1742074521e0d5c7dd8359143fdc051f7d07a6d8b3fce5fcd64" }),
  local_validation: Object.freeze({ path: `${phase}/10-150-LOCAL-VALIDATION.json`, sha256: "f2ed421e61e19ad6a8b9e3d0cd72eb1cdd0477778a1472aa78ba8c9f76707b01" }),
});
const consumedLiveArtifactKeys = ["commit", "mode", "path", "sha256"];
const consumedLiveArchiveKeys = ["artifacts", "authority", "certifier_sha256", "generation", "manifest_sha256", "mcp_tools_call_count", "non_planning_tree", "observed_provider_requests", "outcome", "replay_allowed", "reservation_count", "reviewed_commit", "schema", "status"];
const currentConsumedLiveArchiveKeys = [...consumedLiveArchiveKeys, "cause"];
const latestConsumedLiveArchiveKeys = [...currentConsumedLiveArchiveKeys, "superseded_by_fix"];
const immutableImageConsumedLiveArchiveKeys = [...latestConsumedLiveArchiveKeys, "debug_archive_commit"];

export function auditConsumedLiveArchive(value) {
  if (value?.generation === certifiedOutputConsumedLiveGeneration) {
    if (!exactKeys(value, immutableImageConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "certified_live_output_cap_underprovisioned"
      || value.superseded_by_fix !== "ad16455" || value.debug_archive_commit !== "ad16455"
      || value.reviewed_commit !== "023392e08c1145991db685e7b7b92ca2c4da15a1"
      || value.manifest_sha256 !== "75da78e69fad1ce563b71046c901014d65dcf1d60cd4b01346a34af8c1d61f1a"
      || value.non_planning_tree !== "14bd6a18cf4aa985e74d78c18db78ad911d4376729912c3ed0abd7862597498e"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "920d4530ffbae7b415f2c4f5933bfefe7d96faa3bc754a28706e623c51104db7"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(certifiedOutputConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(certifiedOutputConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== certifiedOutputConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === promptV2ConsumedLiveGeneration) {
    if (!exactKeys(value, immutableImageConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "provider_output_budget_unbounded"
      || value.superseded_by_fix !== "77b82a4" || value.debug_archive_commit !== "19fae6d"
      || value.reviewed_commit !== "705117fcec160235661c29c0678061e332726dc0"
      || value.manifest_sha256 !== "d2e257077907560811e3858e3294504603cc3238b2973d5142d82fa7c980a96f"
      || value.non_planning_tree !== "06dbbbd88f5cdfaee9f4e44e00262be04a13286717c33b9054aa71a6b01ee5f1"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "196c563f7041649d453add9ab2d03547f53b752086471b0d9e34d93f9aceaaae"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(promptV2ConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(promptV2ConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== promptV2ConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === finishReasonConsumedLiveGeneration) {
    if (!exactKeys(value, immutableImageConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "finish_reason_contract_missing"
      || value.superseded_by_fix !== "92790db" || value.debug_archive_commit !== "92790db"
      || value.reviewed_commit !== "90466943759ef97b26ea57edd9af4c60d4b6d876"
      || value.manifest_sha256 !== "dfadc1e25a618dff9b8980116746c0d9084b98fb7d21cde1e0e90237b0196647"
      || value.non_planning_tree !== "9467bd8f095d78bf37cde659c93e933b1b7c5e8077162dc0841799039ff7008c"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "d3717a1e0ebffff776900d40274d8587f92bbe55cf58b6fd1f917a3b3e66bf81"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(finishReasonConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(finishReasonConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== finishReasonConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === inertProseBracketConsumedLiveGeneration) {
    if (!exactKeys(value, immutableImageConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "inert_prose_square_brackets_rejected_as_structural_context"
      || value.superseded_by_fix !== "e7d21f5" || value.debug_archive_commit !== "48b2ae9"
      || value.reviewed_commit !== "9286205a6ec022135f4e302c69279eee20aa642e"
      || value.manifest_sha256 !== "ff41d75a11fe972555fc863b5a8a3714f711cc911f376ccfa26c088a5a210fb4"
      || value.non_planning_tree !== "04f8bac8195d24f2c806a4f407ea84c5ed4a6b3e3e40de5de15bedc71df0ca78"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "09d57c2725ad6b8f2aada7c11c861267daf7b6b95bd11ed839bc607cee75e7c9"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(inertProseBracketConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(inertProseBracketConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== inertProseBracketConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === singletonArrayConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "singleton_findings_array_rejected_as_structural_context"
      || value.superseded_by_fix !== "bab40b9" || value.reviewed_commit !== "28507f7f0a91fb667c3dbda084cb69a856a6a523"
      || value.manifest_sha256 !== "637dfaf6efadad8a7affe4d7d766503aa31da491b90c4355a190b2759c964769"
      || value.non_planning_tree !== "f7563f683fbcfd1af2d51f9b9a1de13dd2c16dc40b9c76ae0ad29f8de6dcbd9c"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "2fcea1035069a8bff0ea6086c3d1c46cff37abd4942eef0cfcbf1f6da6fcd828"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(singletonArrayConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(singletonArrayConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== singletonArrayConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === authenticatedDiagnosticConsumedLiveGeneration) {
    if (!exactKeys(value, immutableImageConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "extraction_shape_codes_absent_from_authenticated_stderr_allowlist"
      || value.superseded_by_fix !== "c313ccd" || value.debug_archive_commit !== "7a36f5a"
      || value.reviewed_commit !== "f261c37827bf2a98b90e92d4b210b648941f6880"
      || value.manifest_sha256 !== "b9f58b2f3c287b42e4568677267670293b0c3456db57ed8bd012dbd47e89d206"
      || value.non_planning_tree !== "be3e88dba06ed635590d59399aa909cdce81b1d8b89ce9ef24a0a8e2b091b658"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "493af38669e772a36a71a8d6ad524bc1e9c6912f566878cf46c3ca4ebd3f745b"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(authenticatedDiagnosticConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(authenticatedDiagnosticConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== authenticatedDiagnosticConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === extractionDiagnosticConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "provider_json_extraction_states_collapsed_before_authenticated_diagnostic"
      || value.superseded_by_fix !== "e213bda/d397109" || value.reviewed_commit !== "c2572f8a386e1f5c45c1fe1861dcb8e60da6eb9b"
      || value.manifest_sha256 !== "6f8e58a5c6be294b3bf536c4a04c95a5301a5b31b00649d3ab48ccf032325485"
      || value.non_planning_tree !== "5e761c6182543736d69ade5579172f4410dfb5eda0b3f10885dcb0e5995d9def"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "48a71d669f709872e70280989fa34a477fac5be3aa7bd58173323c4bf781e5a2"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(extractionDiagnosticConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(extractionDiagnosticConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== extractionDiagnosticConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === boundedJsonConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "provider_json_object_extraction_ambiguous_wrapper"
      || value.superseded_by_fix !== "e91d3ac" || value.reviewed_commit !== "73e5b8ff86d582627ca9458e8b717c52b2cc88be"
      || value.manifest_sha256 !== "1d58f11a2e0e7d0c187840514d3afa77345ed0ec51d099fc18bb4adafaba52c7"
      || value.non_planning_tree !== "dd40a2734a7dfbf537606cd65106430438ff4ce872ed74d2128832b76d3ba330"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "9c36c493c2835d0ca4212a7a69614fb491180634d26227eb79840cea1beea6ba"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(boundedJsonConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(boundedJsonConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== boundedJsonConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === immutableImageConsumedLiveGeneration) {
    if (!exactKeys(value, immutableImageConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "mutable_compose_image_and_rejected_direct_system_error"
      || value.superseded_by_fix !== "4f8fccd" || value.debug_archive_commit !== "30d57ad"
      || value.reviewed_commit !== "51af5448169c2add2ed775e97914e35188d2d6a4"
      || value.manifest_sha256 !== "4551f0cf64b1769b9b8d96d87ce85f67330080d305c6880debfbe60de9442987"
      || value.non_planning_tree !== "473cf180f20794a02688e11d7257b64d3f90c1849156019ef290ff37bafa9827"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "7bfddc51851413c6f0eb10c2f9dc10a5611716cd9a776497582c3ad84fdad8bd"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(immutableImageConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(immutableImageConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== immutableImageConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === diagnosticCapabilityConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "request_receipt_initialization_consumed_shared_diagnostic_capability"
      || value.superseded_by_fix !== "6b018f0" || value.reviewed_commit !== "d10b8a14e947220316d5d74079d5b6bb45b5d311"
      || value.manifest_sha256 !== "dd780329561c22e322c922bfc1c94c4a6f6a324b9c9a4b410688044c215c8a62"
      || value.non_planning_tree !== "4f7b0905a22df074e9047cb6019370a2e2bc77ed3d6965c4881b2f9944953ac1"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "158bf62cd970f84795fbf375098f9167a2bfa624364c7a11817405d1bca99bd1"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(diagnosticCapabilityConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(diagnosticCapabilityConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== diagnosticCapabilityConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === postFetchConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "post_fetch_diagnostic_was_not_authenticated_before_sanitization"
      || value.superseded_by_fix !== "a947cdd" || value.reviewed_commit !== "71f7e79e83afcb4e87f36ee2dead50b391801a35"
      || value.manifest_sha256 !== "2c6669f1adfb9bdf8a926d36834c6e1e1564eefd1061c495d98b3195eab94b08"
      || value.non_planning_tree !== "25006be2f96225108adf457146bda0afb1965570557c3cc8c4ef48c5f7451553"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "00cf636166807e7fa96e832c66e8e731235475cecb0702d3a9a57a33c2c47dbc"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 1
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(postFetchConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(postFetchConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== postFetchConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === protocolConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "sdk_pre_callback_validation_bypassed_handler_receipt_settlement"
      || value.superseded_by_fix !== "bfff3dc" || value.reviewed_commit !== "bfbbe499d526a79f7e7f1bcbb9ae380cd61a5824"
      || value.manifest_sha256 !== "795b71bd773f7aef9851b11ad014dc054b653e39ea9ad5617ebf6aee02790a92"
      || value.non_planning_tree !== "4e5a096c3bfc9a31d4a651221527147eb277f9168f2a0c26913016201516cd1f"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "64d839c83af63f1514363ac0d16204043543094a0eb6298826a30a5b0d4e4588"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 0
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(protocolConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(protocolConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== protocolConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === recoveredConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "missing_request_boundary_receipt_producer"
      || value.superseded_by_fix !== "94184b2" || value.reviewed_commit !== "2f93a00e3fa255d5a7e12c917e43b1eb7acad8e8"
      || value.manifest_sha256 !== "705eacdf8935a7a1ded43508d2d7c71838b014c3db9f86c31ccceb20f59fdc9e"
      || value.non_planning_tree !== "dfba44b71c3d29ab9ccd11e71cdde1c5c6b52e07a8b13838a76598ecc18a64e3"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "63a5c98926cd094467a7830561cfee51a5dc75688247c05ebc7a524c209d3124"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 0
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(recoveredConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(recoveredConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== recoveredConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === newestConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "exit_close_preempted_buffered_authenticated_stderr"
      || value.superseded_by_fix !== "18ca920" || value.reviewed_commit !== "cf04ac2f3c1458fdbdbb6b549f715334ec526bb8"
      || value.manifest_sha256 !== "20a84a718f1ac86709c9e3a4043483e9167495d4a2043c2d584304cf1ee0b023"
      || value.non_planning_tree !== "ed763a70bf3d6435b584619fec70ff3e2068a196f5003b69de4d44019c3d56b0"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "892c769c932540a3fa61dbc4182513bf2f09d08bf76927f58fcc76d3be2bd6f6"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 0
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(newestConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(newestConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== newestConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === previousNewestConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "premature_parent_sigterm_before_receipt_cleanup"
      || value.superseded_by_fix !== "2b36e6d" || value.reviewed_commit !== "84735050f8f0793be9a7aec703e7915602e6f4d8"
      || value.manifest_sha256 !== "437e8a38004dc9300db5f68ff1ec5bd045843e714b2a03c911109c2073faac00"
      || value.non_planning_tree !== "1f4ef0eed7173c8576748c8c41b331becf970e6f7609a55bca73b1a2e334ad14"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "f478bf8af35a3cd4c0ebba62bf6a066c21d26860c937d8c454429a645d7af094"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 0
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(previousNewestConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(previousNewestConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== previousNewestConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  if (value?.generation === latestConsumedLiveGeneration) {
    if (!exactKeys(value, latestConsumedLiveArchiveKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
      || value.authority !== false || value.replay_allowed !== false || value.cause !== "post_tools_lifecycle_drain_race"
      || value.superseded_by_fix !== "0b47dbb" || value.reviewed_commit !== "1be82ac761ce591e6a9cfa4c8080df4cbf845e1b"
      || value.manifest_sha256 !== "fce7778a05ac5d4e19186f2a2c04cbd16b62efbc66a8d997bc2935d19a8510f8"
      || value.non_planning_tree !== "2558fa82923289001c8abe5f027d9e290bb97d35747f4d986a184127f8b10211"
      || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
      || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
      || value.certifier_sha256.audit_proof_chain_sha256 !== "dbf5c7b91679c9f3bd03f42bee980e0ed47e739d1324cdb4a5e6bb69624e7343"
      || value.reservation_count !== 1 || value.mcp_tools_call_count !== 1 || value.observed_provider_requests !== 0
      || value.outcome !== "request_failed" || value.status !== "gaps_found"
      || !exactKeys(value.artifacts, Object.keys(latestConsumedLiveFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
    for (const [name, expected] of Object.entries(latestConsumedLiveFiles)) {
      const artifact = value.artifacts[name];
      if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== latestConsumedLiveCommit
        || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
    }
    return Object.freeze({ authority: false, status: "gaps_found" });
  }
  const legacy = value?.generation === legacyConsumedLiveGeneration;
  const prior = value?.generation === consumedLiveGeneration;
  const expectedGeneration = legacy ? legacyConsumedLiveGeneration : prior ? consumedLiveGeneration : currentConsumedLiveGeneration;
  const expectedCommit = legacy ? legacyConsumedLiveCommit : prior ? consumedLiveCommit : currentConsumedLiveCommit;
  const expectedFiles = legacy ? legacyConsumedLiveFiles : prior ? consumedLiveFiles : currentConsumedLiveFiles;
  const expectedKeys = legacy ? consumedLiveArchiveKeys : currentConsumedLiveArchiveKeys;
  const expectedMetadata = legacy ? {
    auditProof: "6e22b85bc9abbeb2ca8a04f28b99306367ddd69e6e85c4d82e065838326d8619",
    manifest: "10151b767b922cad23f0cd642767fa0796471ba71bff8dd82c38aaf87d560516",
    nonPlanningTree: "309c1f26d5707ed8e1ba9c10e22ca6eb97defb7435c4f2dcec5fdc47cbcba3b4",
    outcome: "automatic_terminal_missing",
    reviewedCommit: "26ba4806d9ef25717b0d1c180bd62aa4216cb634",
  } : prior ? {
    auditProof: "d671950bd0c248e0538bdcc38cd492cdca00c0da25228e11ccb7d21cb67af6cd",
    manifest: "6d3a5ce527a41a66de67aa98a683b500b67272fd8939ffe0f2a4b02a5e475a5e",
    nonPlanningTree: "b4fc225005464daebfa4fe0b1bbce580e4badde30ad0b404ebffd76d434a3c49",
    outcome: "request_failed",
    reviewedCommit: "4dcd025c47f35b29aeffbf8e8eeb4b7abfc839b2",
  } : {
    auditProof: "0f11fd7ec47f0fc14382f28a8e50130a2c05657b244a1aee1d948d1e83705d2d",
    manifest: "a45fd8656314c041f5b83174820d313bcf5b34426fc71857e13a6d8f022882b2",
    nonPlanningTree: "2ca2ea34fd8336db77c0aa1f5ada2aa8d8089b08c1846fd50d4eedc1b6cad852",
    outcome: "request_failed",
    reviewedCommit: "1ebe63eba01801fae1a4fa13332196d19e032bbc",
  };
  if (!exactKeys(value, expectedKeys) || value.schema !== "evidencelens.consumed-live-archive.v1"
    || value.generation !== expectedGeneration || value.authority !== false || value.replay_allowed !== false
    || (!legacy && value.cause !== (prior ? "automatic_terminal_missing_before_tools" : "compose_inactive_profile_interpolation"))
    || value.reviewed_commit !== expectedMetadata.reviewedCommit
    || value.manifest_sha256 !== expectedMetadata.manifest
    || value.non_planning_tree !== expectedMetadata.nonPlanningTree
    || !exactKeys(value.certifier_sha256, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"])
    || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
    || value.certifier_sha256.audit_proof_chain_sha256 !== expectedMetadata.auditProof
    || value.reservation_count !== 1 || value.mcp_tools_call_count !== 0 || value.observed_provider_requests !== 0
    || value.outcome !== expectedMetadata.outcome || value.status !== "gaps_found"
    || !exactKeys(value.artifacts, Object.keys(expectedFiles))) fail("PROOF_CHAIN_CONSUMED_LIVE");
  for (const [name, expected] of Object.entries(expectedFiles)) {
    const artifact = value.artifacts[name];
    if (!exactKeys(artifact, consumedLiveArtifactKeys) || artifact.commit !== expectedCommit
      || artifact.mode !== "0600" || artifact.path !== expected.path || artifact.sha256 !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
  }
  return Object.freeze({ authority: false, status: "gaps_found" });
}

async function syncDirectory(path) {
  const handle = await open(path, fsConstants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function createConsumedLiveArchive(path = certifiedOutputConsumedLivePath) {
  if (path !== certifiedOutputConsumedLivePath) fail("PROOF_CHAIN_ARGV");
  const artifacts = {};
  const parsedArtifacts = {};
  for (const [name, expected] of Object.entries(certifiedOutputConsumedLiveFiles)) {
    let committed;
    try { committed = (await execFileAsync("git", ["show", `${certifiedOutputConsumedLiveCommit}:${expected.path}`], { encoding: null, maxBuffer: 1024 * 1024 })).stdout; }
    catch { fail("PROOF_CHAIN_CONSUMED_LIVE"); }
    let handle;
    try {
      handle = await open(expected.path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      const stat = await handle.stat(); const bytes = await handle.readFile();
      if (!stat.isFile() || stat.uid !== process.getuid?.() || (stat.mode & 0o777) !== 0o600 || !bytes.equals(committed)
        || sha256Hex(bytes) !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE");
      const reopened = await open(expected.path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      try { if (sha256Hex(await reopened.readFile()) !== expected.sha256) fail("PROOF_CHAIN_CONSUMED_LIVE"); } finally { await reopened.close(); }
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); const parsed = JSON.parse(text);
      if (canonicalJson(parsed) !== text) fail("PROOF_CHAIN_CONSUMED_LIVE");
      parsedArtifacts[name] = parsed;
      artifacts[name] = { commit: certifiedOutputConsumedLiveCommit, mode: "0600", path: expected.path, sha256: expected.sha256 };
    } catch (error) {
      if (error instanceof Error && error.message === "PROOF_CHAIN_CONSUMED_LIVE") throw error;
      fail("PROOF_CHAIN_CONSUMED_LIVE");
    } finally { await handle?.close().catch(() => undefined); }
  }
  if (parsedArtifacts.transition.generation !== certifiedOutputConsumedLiveGeneration
    || parsedArtifacts.execution.execution_generation !== certifiedOutputConsumedLiveGeneration
    || parsedArtifacts.proof.status !== "gaps_found" || parsedArtifacts.proof.outcome !== "request_failed"
    || parsedArtifacts.execution.status !== "gaps_found" || parsedArtifacts.execution.outcome !== "request_failed"
    || parsedArtifacts.execution.diagnostic?.code !== "request" || parsedArtifacts.execution.diagnostic?.path !== "transport.fetch"
    || parsedArtifacts.execution.reservation_count !== 1 || parsedArtifacts.execution.mcp_tools_call_count !== 1
    || parsedArtifacts.execution.request_receipt?.observed_provider_requests !== 1 || parsedArtifacts.execution.request_receipt?.reservation_count !== 1
    || parsedArtifacts.execution.request_receipt?.max_retries !== 0 || parsedArtifacts.execution.request_receipt?.fallback !== false
    || parsedArtifacts.execution.request_receipt?.diagnostic_second_call !== false || !hash.test(parsedArtifacts.execution.request_receipt_sha256)
    || parsedArtifacts.execution.fixture_count !== 0 || parsedArtifacts.execution.finding_count !== 0
    || parsedArtifacts.execution.exit?.code !== 0 || parsedArtifacts.execution.close?.code !== 0
    || parsedArtifacts.terminal.branch !== "post_fetch_non_pass" || parsedArtifacts.terminal.stream_truncated !== false
    || parsedArtifacts.terminal.diagnostic?.code !== "provider-finish-reason-length"
    || parsedArtifacts.terminal.observed_provider_requests !== 1 || parsedArtifacts.terminal.request_receipt?.observed_provider_requests !== 1
    || parsedArtifacts.local_validation.validation?.execution !== "passed" || parsedArtifacts.local_validation.validation?.proof !== "passed") fail("PROOF_CHAIN_CONSUMED_LIVE");
  const value = { artifacts, authority: false, cause: "certified_live_output_cap_underprovisioned", certifier_sha256: {
    audit_live_evidence_sha256: "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500",
    audit_proof_chain_sha256: "920d4530ffbae7b415f2c4f5933bfefe7d96faa3bc754a28706e623c51104db7",
  }, debug_archive_commit: "ad16455", generation: certifiedOutputConsumedLiveGeneration, manifest_sha256: "75da78e69fad1ce563b71046c901014d65dcf1d60cd4b01346a34af8c1d61f1a",
    mcp_tools_call_count: 1, non_planning_tree: "14bd6a18cf4aa985e74d78c18db78ad911d4376729912c3ed0abd7862597498e",
    observed_provider_requests: 1, outcome: "request_failed", replay_allowed: false, reservation_count: 1,
    reviewed_commit: "023392e08c1145991db685e7b7b92ca2c4da15a1", schema: "evidencelens.consumed-live-archive.v1", status: "gaps_found", superseded_by_fix: "ad16455" };
  auditConsumedLiveArchive(value);
  const bytes = Buffer.from(canonicalJson(value)); const temporary = `${path}.tmp-${process.pid}-${randomBytes(12).toString("hex")}`;
  let temp; let reservation;
  try {
    temp = await open(temporary, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await temp.writeFile(bytes); await temp.sync(); await temp.close(); temp = undefined;
    reservation = await open(path, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
    await reservation.close(); reservation = undefined;
    await rename(temporary, path); await syncDirectory(dirname(path));
    const reopened = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    try { const stat = await reopened.stat(); const persisted = await reopened.readFile(); if ((stat.mode & 0o777) !== 0o600 || sha256Hex(persisted) !== sha256Hex(bytes)) fail("PROOF_CHAIN_CONSUMED_LIVE"); }
    finally { await reopened.close(); }
    return value;
  } catch (error) {
    await temp?.close().catch(() => undefined); await reservation?.close().catch(() => undefined); await unlink(temporary).catch(() => undefined);
    if (error?.code === "EEXIST") fail("PROOF_CHAIN_REPLAY");
    if (error instanceof Error && /^PROOF_CHAIN_/u.test(error.message)) throw error;
    fail("PROOF_CHAIN_CONSUMED_LIVE");
  }
}

/** These ordered registries are production constants, not caller input. */
export const BRANCH_AUTHORITY_REGISTRIES = Object.freeze({
  preflight: Object.freeze({
    branch: "preflight_started",
    schema: "evidencelens.preflight-sync-authority.v1",
    paths: Object.freeze([forensicPath, transitionPath, executionPath, proofPath, localValidationPath]),
  }),
  live: Object.freeze({
    branch: "preflight_authenticated",
    schema: "evidencelens.live-sync-authority.v1",
    paths: Object.freeze([forensicPath, sourcePath, reviewPath, securityPath, buildPath, transitionPath, executionPath, proofPath, localValidationPath]),
  }),
});

export const FINAL_AUDIT_REGISTRIES = Object.freeze({
  preflight: Object.freeze([...BRANCH_AUTHORITY_REGISTRIES.preflight.paths, `${phase}/10-156-SYNC-CLAIM.json`, `${phase}/10-156-SYNC-JOURNAL.json`]),
  live: Object.freeze([...BRANCH_AUTHORITY_REGISTRIES.live.paths, `${phase}/10-156-SYNC-CLAIM.json`, `${phase}/10-156-SYNC-JOURNAL.json`]),
});

const ownerCapabilities = new WeakSet();
/** The returned object has identity only; it contains no serializable authority. */
export function createTerminalOwnerCapability() {
  const capability = Object.freeze(Object.create(null));
  ownerCapabilities.add(capability);
  return capability;
}
export function closeTerminalOwnerCapability(capability) { ownerCapabilities.delete(capability); }
function requireOwner(capability) { if (!ownerCapabilities.has(capability)) fail("PROOF_CHAIN_LOCAL_OWNER"); }

const validationReceiptKeys = ["artifact_sha256", "auditors", "branch", "capability_identity", "generation", "outcome", "schema", "validation"];
export function validateTerminalOwnerReceipt(value) {
  if (!exactKeys(value, validationReceiptKeys) || value.schema !== "evidencelens.terminal-owner-validation.v1"
    || !hash.test(value.generation) || !["preflight_started", "preflight_authenticated"].includes(value.branch)
    || typeof value.capability_identity !== "string" || !hash.test(value.capability_identity)
    || !exactKeys(value.artifact_sha256, ["execution", "proof", "transition"])
    || Object.values(value.artifact_sha256).some((entry) => !hash.test(entry))
    || !exactKeys(value.auditors, ["execution", "proof"]) || value.auditors.execution !== "execution-auto" || value.auditors.proof !== "proof-auto"
    || !exactKeys(value.validation, ["execution", "proof"])
    || !["passed", "failed"].includes(value.validation.execution) || !["passed", "failed"].includes(value.validation.proof)
    || typeof value.outcome !== "string" || value.outcome.length === 0) fail("PROOF_CHAIN_LOCAL_VALIDATION");
  return Object.freeze(value);
}

export function auditExecutionAuto(capability, transition, execution) {
  requireOwner(capability);
  const branch = authenticatedBranch(transition);
  auditExecution(execution);
  assertBranchExecution(branch, execution);
  return Object.freeze({ branch, status: execution.status });
}
export function auditProofAuto(capability, transition, execution, proof) {
  requireOwner(capability);
  const branch = authenticatedBranch(transition);
  auditExecution(execution);
  if (branch === "preflight_started") auditPreflightProof(proof); else auditLiveProof(proof);
  assertBranchExecution(branch, execution);
  if (proof.execution_sha256 !== sha256Hex(Buffer.from(canonicalJson(execution))) || proof.outcome !== execution.outcome || proof.status !== execution.status) fail("PROOF_CHAIN_IDENTITY");
  return Object.freeze({ branch, status: proof.status });
}

function auditPreflightProof(value) {
  if (!exactKeys(value, proofKeys) || value.schema !== "evidencelens.live-proof.v3") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)
    || value.execution_sha256 === unavailable || !hash.test(value.execution_sha256)
    || [value.build_sha256, value.review_sha256, value.security_sha256, value.source_sha256].some((entry) => entry !== unavailable)
    || value.status !== "gaps_found" || value.outcome !== "preflight_failed" || value.clean_exit !== false
    || value.fixture_count !== 0 || value.finding_count !== 0) fail("PROOF_CHAIN_PREFLIGHT_PROOF");
  return sourceIdentity(value);
}

function authenticatedBranch(transition) {
  if (!plain(transition) || transition.schema !== "evidencelens.live-transition.v1"
    || !["preflight_started", "preflight_authenticated"].includes(transition.branch)
    || !hash.test(transition.generation)) fail("PROOF_CHAIN_TRANSITION");
  return transition.branch;
}
function assertBranchExecution(branch, execution) {
  if (branch === "preflight_started") {
    if (execution.status !== "gaps_found" || execution.outcome === "passed" || execution.mcp_tools_call_count !== 0
      || execution.reservation_count !== 0 || execution.request_receipt !== null) fail("PROOF_CHAIN_BRANCH");
  } else if (execution.reservation_count !== 1) fail("PROOF_CHAIN_BRANCH");
}

export const PROOF_CHAIN_MODES = Object.freeze({
  "consumed-live-archive": mode(["10-152-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-145": mode(["10-147-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-140": mode(["10-142-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-135": mode(["10-137-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-130": mode(["10-132-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-125": mode(["10-127-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-120": mode(["10-122-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-115": mode(["10-117-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-110": mode(["10-112-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-105": mode(["10-107-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-100": mode(["10-102-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-95": mode(["10-97-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-90": mode(["10-92-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-85": mode(["10-87-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-80": mode(["10-82-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-75": mode(["10-77-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-70": mode(["10-72-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-65": mode(["10-67-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "consumed-live-archive-10-59": mode(["10-62-CONSUMED-LIVE.json"], ["evidencelens.consumed-live-archive.v1"]),
  "forensic-consumed-generation": mode(["10-53-FORENSIC.json"], ["evidencelens.consumed-generation-forensic.v1"]),
  "source-review": mode(["10-49-SOURCE.json", "10-49-REVIEW.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2"]),
  "source-review-auto": mode(["10-153-SOURCE.json", "10-153-REVIEW.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2"]),
  reviews: mode(["10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  "reviews-auto": mode(["10-153-SOURCE.json", "10-153-REVIEW.md", "10-153-SECURITY.md"], ["evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  build: mode(["10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  "build-auto": mode(["10-154-FINAL-BUILD.json", "10-153-SOURCE.json", "10-153-REVIEW.md", "10-153-SECURITY.md"], ["evidencelens.build-auto.branch", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  diagnostic: mode(["10-29-DIAGNOSTIC.json", "10-28-DIAGNOSTIC-BUILD.json"], ["evidencelens.diagnostic.v2", "evidencelens.build.v2"]),
  repair: mode(["10-30-REPAIR.json", "10-29-DIAGNOSTIC.json"], ["evidencelens.repair.v2", "evidencelens.diagnostic.v2"]),
  "repair-set": mode(["10-29-DIAGNOSTIC.json", ...repairNames], ["evidencelens.diagnostic.v2", ...repairNames.map(() => "evidencelens.repair.v2")], true),
  execution: mode(["10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.execution.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  proof: mode(["10-51-PROOF.json", "10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.live-proof.v3", "evidencelens.execution.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]),
  "sync-authority": mode(["10-51-PROOF.json", "10-51-EXECUTION.json", "10-50-FINAL-BUILD.json", "10-49-SOURCE.json", "10-49-REVIEW.md", "10-49-SECURITY.md"], ["evidencelens.live-proof.v3", "evidencelens.execution.v2", "evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"], true),
});
const consumedLiveArchiveModes = new Set(Object.keys(PROOF_CHAIN_MODES).filter((name) => name.startsWith("consumed-live-archive")));

function fail(code) { throw new Error(code); }
function plain(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, expected) {
  return plain(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}
function validateCertifiers(value) {
  if (!exactKeys(value, ["audit_live_evidence_sha256", "audit_proof_chain_sha256"]) ||
      !hash.test(value.audit_live_evidence_sha256) || !hash.test(value.audit_proof_chain_sha256)) fail("PROOF_CHAIN_SCHEMA");
}

export function sourceIdentity(value) {
  return {
    certifier_sha256: value.certifier_sha256,
    manifest_sha256: value.manifest_sha256,
    non_planning_tree: value.non_planning_tree,
    reviewed_commit: value.reviewed_commit,
  };
}

export function auditChainRecord(value) {
  if (plain(value) && value.schema === "evidencelens.consumed-live-archive.v1") return auditConsumedLiveArchive(value);
  if (plain(value) && value.schema === "evidencelens.consumed-generation-forensic.v1") return auditConsumedGenerationForensic(value);
  if (plain(value) && value.schema === "evidencelens.live-proof.v3") return auditLiveProof(value);
  if (plain(value) && value.schema === "evidencelens.execution.v2") return auditExecution(value);
  if (plain(value) && (value.schema === "evidencelens.build-terminal.v1" || value.schema === "evidencelens.build.v2" && exactKeys(value, buildKeys))) {
    auditBuildAuto(value);
    return sourceIdentity(value);
  }
  if (plain(value) && value.schema === "evidencelens.build.v2" && exactKeys(value, buildKeys)) {
    auditBuild(value);
    return sourceIdentity(value);
  }
  if (!exactKeys(value, keys) || !schemas.has(value.schema)) fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)) fail("PROOF_CHAIN_SCHEMA");
  if (!schemas.get(value.schema).has(value.status)) fail("PROOF_CHAIN_STATE");
  return sourceIdentity(value);
}

const forensicKeys = [
  "build_generation", "build_image_id", "build_sha256", "canonical_encoding", "certifier_sha256",
  "committed_state_commit", "committed_state_mode", "committed_state_path", "committed_state_sha256",
  "diagnostic", "generation", "inner_status", "lifecycle_close", "lifecycle_exit", "manifest_sha256",
  "mcp_tools_call_count", "non_planning_tree", "observed_provider_requests", "outcome", "previous_sha256",
  "request_receipt", "request_receipt_mac", "reservation_count", "result", "reviewed_commit", "schema",
  "sequence", "status", "transcript", "wrapper_status",
];

export function auditConsumedGenerationForensic(value) {
  if (!exactKeys(value, forensicKeys) || value.schema !== "evidencelens.consumed-generation-forensic.v1") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (value.status !== "gaps_found" || value.outcome !== "terminal_evidence_incomplete"
    || value.committed_state_commit !== consumedStateCommit || value.committed_state_path !== consumedStatePath
    || value.committed_state_sha256 !== "fccf4bf8244b73cea24ac00a47653762164906ec451d1373de1260a43e30a387"
    || value.canonical_encoding !== "utf-8/canonical-json" || value.committed_state_mode !== "0600"
    || value.generation !== "aa9559e40fb797ce19457fdbbecb5a59913befb124d6258b4ea506e7596ce19f"
    || value.sequence !== 4 || value.previous_sha256 !== "ba48bb767a5dc0648e58c062364e79865235056b4bcfaa1eb0d3ceadfca08a09"
    || value.wrapper_status !== "completed" || value.inner_status !== "failed"
    || value.reservation_count !== 1 || value.mcp_tools_call_count !== 0 || value.observed_provider_requests !== 0
    || ["diagnostic", "request_receipt", "request_receipt_mac", "lifecycle_exit", "lifecycle_close", "transcript", "result"].some((key) => value[key] !== unavailable)
    || value.reviewed_commit !== "5751312a28da639ebe0b24834b18d90655efe4b3"
    || value.non_planning_tree !== "4f9b2179939056aaa632d06f0b7405eddfde2322c7fcd207de5b6817f88dd79a"
    || value.manifest_sha256 !== "8a8556d3eb5bd93f04e27ba5becb369aa2fecf9ffbe596f443f1b42732ce76fd"
    || value.certifier_sha256.audit_live_evidence_sha256 !== "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500"
    || value.certifier_sha256.audit_proof_chain_sha256 !== "ee6e0fe5a3c9e3a9aa2f408d3dda31bcb182c2c825afc9ed51a6472e2594e802"
    || value.build_generation !== "aa9559e40fb797ce19457fdbbecb5a59913befb124d6258b4ea506e7596ce19f"
    || value.build_image_id !== "sha256:5766201ff50c1fb4f0688443d11793eb4192ea209cc6d99f435f498deec4d270"
    || value.build_sha256 !== "d0af8988e0e9c070b9dcd5c6095ae3a86536c00821a05b6b7d4a5d88b427d3be") fail("PROOF_CHAIN_FORENSIC");
  return sourceIdentity(value);
}

export function auditLiveProof(value) {
  if (!exactKeys(value, proofKeys) || value.schema !== "evidencelens.live-proof.v3") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)) fail("PROOF_CHAIN_SCHEMA");
  if (["build_sha256", "execution_sha256", "review_sha256", "security_sha256", "source_sha256"].some((key) => !hash.test(value[key]))) fail("PROOF_CHAIN_SCHEMA");
  const passed = value.outcome === "passed";
  if (!passed && !nonPassOutcomes.has(value.outcome)) fail("PROOF_CHAIN_STATE");
  if (passed
    ? value.status !== "passed" || value.clean_exit !== true || value.fixture_count !== 4 || !Number.isSafeInteger(value.finding_count) || value.finding_count < 1
    : value.status !== "gaps_found" || value.clean_exit !== false || value.fixture_count !== 0 || value.finding_count !== 0) fail("PROOF_CHAIN_STATE");
  return sourceIdentity(value);
}

const buildKeys = [...keys, "build_count", "daemon_identity_sha256", "fixture_sha256", "generation", "image_config_sha256", "image_content_sha256", "image_id", "runtime_sha256", "verifier_build_count"];
const terminalBuildKeys = [...keys, "attempted_input_paths", "build_count", "diagnostic", "generation", "input_sha256", "verifier_build_count"];
const receiptKeys = ["diagnostic_second_call", "fallback", "generation", "mac", "max_retries", "observed_provider_requests", "reservation_count", "schema"];
const lifecycleKeys = ["code", "observed", "signal"];
const resultKeys = ["finding_count", "fixture_count", "model", "provider", "provenance", "public_schema"];
const transcriptKeys = ["close_code", "exit_code", "mcp_method", "tool"];
const executionKeys = [...keys, "argv", "build_generation", "clean_exit", "close", "diagnostic", "environment", "execution_generation", "exit", "finding_count", "fixture_count", "image_id", "mcp_tools_call_count", "model", "outcome", "provider", "repair_set", "request_receipt", "request_receipt_sha256", "reservation_count", "result", "result_sha256", "transcript", "transcript_sha256"];
const diagnosticCodes = new Set(["pre_fetch", "request", "timeout", "protocol", "disclosure", "malformed", "abnormal_close"]);

function auditBuild(value) {
  if (!exactKeys(value, buildKeys) || value.schema !== "evidencelens.build.v2" || value.status !== "ready"
    || value.build_count !== 1 || value.verifier_build_count !== 0 || !hash.test(value.generation)
    || !/^sha256:[0-9a-f]{64}$/u.test(value.image_id)
    || ["daemon_identity_sha256", "image_config_sha256", "image_content_sha256", "runtime_sha256"].some((key) => !hash.test(value[key]))
    || !Array.isArray(value.fixture_sha256) || value.fixture_sha256.length !== 4 || value.fixture_sha256.some((entry) => !hash.test(entry))) fail("PROOF_CHAIN_BUILD");
}

export function auditBuildAuto(value) {
  if (value?.schema === "evidencelens.build.v2") {
    auditBuild(value);
    return Object.freeze({ branch: "ready", status: "ready" });
  }
  const expectedPaths = PROOF_CHAIN_MODES["build-auto"].paths.slice(1);
  if (!exactKeys(value, terminalBuildKeys) || value.schema !== "evidencelens.build-terminal.v1"
    || value.status !== "terminal_non_pass" || ![0, 1].includes(value.build_count) || value.verifier_build_count !== 0
    || !hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)
    || !hash.test(value.generation) || JSON.stringify(value.attempted_input_paths) !== JSON.stringify(expectedPaths)
    || !exactKeys(value.diagnostic, ["code"]) || !["input_unavailable", "input_invalid", "build_failed", "verification_failed"].includes(value.diagnostic.code)
    || !exactKeys(value.input_sha256, ["review", "security", "source"])
    || Object.values(value.input_sha256).some((entry) => entry !== "unavailable" && !hash.test(entry))) fail("PROOF_CHAIN_BUILD_AUTO");
  validateCertifiers(value.certifier_sha256);
  return Object.freeze({ branch: "terminal_non_pass", status: "gaps_found" });
}

function auditLifecycle(value) {
  return exactKeys(value, lifecycleKeys) && value.observed === true && (value.code === null || Number.isSafeInteger(value.code))
    && (value.signal === null || typeof value.signal === "string");
}

function auditReceipt(value, execution) {
  if (!exactKeys(value, receiptKeys) || value.schema !== "evidencelens.provider-request-receipt.v1"
    || value.generation !== execution.execution_generation || value.reservation_count !== 1
    || ![0, 1].includes(value.observed_provider_requests) || value.max_retries !== 0
    || value.fallback !== false || value.diagnostic_second_call !== false || !hash.test(value.mac)
    || sha256Hex(Buffer.from(canonicalJson(value))) !== execution.request_receipt_sha256) fail("PROOF_CHAIN_RECEIPT");
}

export function auditExecution(value) {
  if (!exactKeys(value, executionKeys) || value.schema !== "evidencelens.execution.v2") fail("PROOF_CHAIN_SCHEMA");
  validateCertifiers(value.certifier_sha256);
  if (!hash.test(value.manifest_sha256) || !hash.test(value.non_planning_tree) || !commit.test(value.reviewed_commit)
    || !hash.test(value.execution_generation)
    || JSON.stringify(value.argv) !== JSON.stringify(["docker", "compose", "--profile", "review", "run", "--rm", "-T", "review"])
    || !exactKeys(value.environment, ["profile", "provider_disabled"]) || value.environment.profile !== "review" || value.environment.provider_disabled !== false
    || !Array.isArray(value.repair_set) || value.repair_set.length !== 0
    || ![0, 1].includes(value.mcp_tools_call_count) || ![0, 1].includes(value.reservation_count)) fail("PROOF_CHAIN_EXECUTION");
  const preReservation = value.mcp_tools_call_count === 0 && value.reservation_count === 0;
  const preTools = value.mcp_tools_call_count === 0 && value.reservation_count === 1;
  if (preReservation) {
    if (value.build_generation !== unavailable || value.image_id !== unavailable || value.request_receipt !== null || value.request_receipt_sha256 !== null
      || value.transcript !== null || value.transcript_sha256 !== null || value.exit !== null || value.close !== null) fail("PROOF_CHAIN_EXECUTION");
  } else {
    if (!hash.test(value.build_generation) || !/^sha256:[0-9a-f]{64}$/u.test(value.image_id)) fail("PROOF_CHAIN_EXECUTION");
    if (preTools) {
      if (value.request_receipt !== null || value.request_receipt_sha256 !== null) fail("PROOF_CHAIN_RECEIPT");
    } else auditReceipt(value.request_receipt, value);
  }
  if (!preReservation && !preTools) {
    if (!auditLifecycle(value.exit) || !auditLifecycle(value.close) || value.exit.code !== value.close.code || value.exit.signal !== value.close.signal
      || !exactKeys(value.transcript, transcriptKeys) || value.transcript.mcp_method !== "tools/call" || value.transcript.tool !== "review_evidence"
      || value.transcript.exit_code !== value.exit.code || value.transcript.close_code !== value.close.code
      || !hash.test(value.transcript_sha256) || sha256Hex(Buffer.from(canonicalJson(value.transcript))) !== value.transcript_sha256) fail("PROOF_CHAIN_EXECUTION");
  } else if (preTools && (value.transcript !== null || value.transcript_sha256 !== null || value.exit !== null || value.close !== null)) fail("PROOF_CHAIN_EXECUTION");
  const observed = preReservation || preTools ? 0 : value.request_receipt.observed_provider_requests;
  if (value.outcome === "passed") {
    if (preReservation || preTools || value.status !== "passed" || value.clean_exit !== true || value.exit.code !== 0 || value.exit.signal !== null
      || observed !== 1 || value.fixture_count !== 4 || !Number.isSafeInteger(value.finding_count) || value.finding_count < 1
      || value.provider !== "deepseek" || typeof value.model !== "string" || value.model.length < 1 || value.diagnostic !== null
      || !exactKeys(value.result, resultKeys) || value.result.fixture_count !== 4 || value.result.finding_count !== value.finding_count
      || value.result.provider !== value.provider || value.result.model !== value.model || value.result.provenance !== true || value.result.public_schema !== true
      || !hash.test(value.result_sha256) || sha256Hex(Buffer.from(canonicalJson(value.result))) !== value.result_sha256) fail("PROOF_CHAIN_EXECUTION");
  } else if (!nonPassOutcomes.has(value.outcome) || value.status !== "gaps_found" || value.clean_exit !== false || value.fixture_count !== 0 || value.finding_count !== 0
    || value.result !== null || value.result_sha256 !== null || value.provider !== "deepseek" || typeof value.model !== "string"
    || !exactKeys(value.diagnostic, ["code", "path"]) || !diagnosticCodes.has(value.diagnostic.code) || value.diagnostic.path !== "transport.fetch"
    || (preReservation && value.outcome !== "preflight_failed") || (preTools && observed !== 0)
    || (!preReservation && value.diagnostic.code === "pre_fetch" ? observed !== 0 : observed > 1)) fail("PROOF_CHAIN_EXECUTION");
  return sourceIdentity(value);
}

export function auditSourceAndReports(source, deepReview, asvsReview) {
  const records = [source, deepReview, asvsReview];
  const expectedSchemas = ["evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"];
  records.forEach((record, index) => {
    auditChainRecord(record);
    if (record.schema !== expectedSchemas[index]) fail("PROOF_CHAIN_SCHEMA");
  });
  const identity = JSON.stringify(sourceIdentity(source));
  if (records.slice(1).some((record) => JSON.stringify(sourceIdentity(record)) !== identity)) fail("PROOF_CHAIN_IDENTITY");
  return sourceIdentity(source);
}

export function auditRepairSet(diagnostic, repairs) {
  auditChainRecord(diagnostic);
  if (diagnostic.schema !== "evidencelens.diagnostic.v2" || repairs.length !== repairNames.length) fail("PROOF_CHAIN_REPAIR_SET");
  const expectedIdentity = JSON.stringify(sourceIdentity(diagnostic));
  let corrections = 0;
  for (const repair of repairs) {
    auditChainRecord(repair);
    if (repair.schema !== "evidencelens.repair.v2") fail("PROOF_CHAIN_REPAIR_SET");
    if (JSON.stringify(sourceIdentity(repair)) !== expectedIdentity) fail("PROOF_CHAIN_IDENTITY");
    if (repair.status === "ready") corrections += 1;
    else if (repair.status !== "not_required") fail("PROOF_CHAIN_REPAIR_SET");
  }
  const noRepairRoute = diagnostic.status === "passed" || diagnostic.status === "blocked_by_build";
  if ((noRepairRoute && corrections !== 0) || (!noRepairRoute && corrections !== 1)) fail("PROOF_CHAIN_REPAIR_SET");
  return { production_correction: corrections === 1, source_identity: sourceIdentity(diagnostic) };
}

export function auditModeRecords(modeName, records) {
  const specification = PROOF_CHAIN_MODES[modeName];
  if (!specification || !Array.isArray(records) || records.length !== specification.schemas.length) fail("PROOF_CHAIN_ARGV");
  records.forEach((record, index) => {
    auditChainRecord(record);
    if (modeName === "build-auto" && index === 0) {
      if (!["evidencelens.build.v2", "evidencelens.build-terminal.v1"].includes(record.schema)) fail("PROOF_CHAIN_SCHEMA");
    } else if (record.schema !== specification.schemas[index]) fail("PROOF_CHAIN_SCHEMA");
  });
  if (consumedLiveArchiveModes.has(modeName)) return auditConsumedLiveArchive(records[0]);
  const identity = JSON.stringify(sourceIdentity(records[0]));
  if (records.slice(1).some((record) => JSON.stringify(sourceIdentity(record)) !== identity)) fail("PROOF_CHAIN_IDENTITY");
  if (modeName === "repair-set") auditRepairSet(records[0], records.slice(1));
  if (["build", "build-auto", "execution", "proof", "sync-authority"].includes(modeName)) {
    const buildIndex = ["build", "build-auto"].includes(modeName) ? 0 : modeName === "execution" ? 1 : 2;
    if (modeName === "build-auto") auditBuildAuto(records[buildIndex]); else auditBuild(records[buildIndex]);
  }
  if (modeName === "execution") {
    if (records[0].build_generation !== records[1].generation || records[0].image_id !== records[1].image_id) fail("PROOF_CHAIN_IDENTITY");
  }
  if (["proof", "sync-authority"].includes(modeName)) {
    const [proof, execution, build, source, review, security] = records;
    const bindings = {
      execution_sha256: execution,
      build_sha256: build,
      source_sha256: source,
      review_sha256: review,
      security_sha256: security,
    };
    for (const [field, record] of Object.entries(bindings)) {
      if (proof[field] !== sha256Hex(Buffer.from(canonicalJson(record)))) fail("PROOF_CHAIN_IDENTITY");
    }
    if (execution.build_generation !== build.generation || execution.image_id !== build.image_id
      || proof.outcome !== execution.outcome || proof.status !== execution.status || proof.clean_exit !== execution.clean_exit
      || proof.fixture_count !== execution.fixture_count || proof.finding_count !== execution.finding_count) fail("PROOF_CHAIN_IDENTITY");
  }
  return sourceIdentity(records[0]);
}

export async function auditGitIdentity(record, repoDir = process.cwd()) {
  auditChainRecord(record);
  const manifest = await createNonPlanningManifest({ repoDir, reviewedCommit: record.reviewed_commit });
  const manifestSha256 = sha256Hex(Buffer.from(canonicalJson(manifest.entries)));
  const byPath = new Map(manifest.entries.map((entry) => [entry.path, entry.sha256]));
  if (manifest.nonPlanningTree !== record.non_planning_tree || manifestSha256 !== record.manifest_sha256
    || byPath.get("scripts/audit-proof-chain.mjs") !== record.certifier_sha256.audit_proof_chain_sha256
    || byPath.get("scripts/audit-live-evidence.mjs") !== record.certifier_sha256.audit_live_evidence_sha256) fail("PROOF_CHAIN_IDENTITY");
  return sourceIdentity(record);
}

function evidence(text) {
  const match = /```json evidencelens-evidence\n([^`]+)```/u.exec(text);
  if (!match) fail("PROOF_CHAIN_SCHEMA");
  try { return JSON.parse(match[1]); } catch { fail("PROOF_CHAIN_SCHEMA"); }
}
async function load(path, canonicalOwnerOnly = false) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size < 3n || before.size > 1024n * 1024n || before.nlink !== 1n
      || (canonicalOwnerOnly && (before.mode & 0o077n) !== 0n)) fail("PROOF_CHAIN_FILE");
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) fail("PROOF_CHAIN_FILE");
    const reopened = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    let second;
    try { second = await reopened.readFile(); } finally { await reopened.close(); }
    if (sha256Hex(bytes) !== sha256Hex(second)) fail("PROOF_CHAIN_FILE");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    try {
      const value = JSON.parse(text);
      if (canonicalOwnerOnly && text !== canonicalJson(value)) fail("PROOF_CHAIN_FILE");
      return value;
    } catch (error) {
      if (error instanceof Error && /^PROOF_CHAIN_/u.test(error.message)) throw error;
      return evidence(text);
    }
  } catch (error) {
    if (error instanceof Error && /^PROOF_CHAIN_/u.test(error.message)) throw error;
    fail("PROOF_CHAIN_FILE");
  } finally { await handle?.close().catch(() => undefined); }
}
async function assertConsumedState() {
  const state = await load(consumedStatePath, true);
  let committed;
  try {
    committed = (await execFileAsync("git", ["show", `${consumedStateCommit}:${consumedStatePath}`], { encoding: null, maxBuffer: 1024 * 1024 })).stdout;
  } catch { fail("PROOF_CHAIN_FORENSIC"); }
  const working = await readFile(consumedStatePath);
  if (!working.equals(committed) || sha256Hex(committed) !== "fccf4bf8244b73cea24ac00a47653762164906ec451d1373de1260a43e30a387"
    || canonicalJson(state) !== committed.toString("utf8")) fail("PROOF_CHAIN_FORENSIC");
}
export async function auditConsumedGenerationForensicFile(path) {
  const value = await load(path, true);
  auditConsumedGenerationForensic(value);
  return value;
}
async function assertCommittedInputs(paths, repoDir = process.cwd()) {
  for (const path of paths) {
    let committed;
    try { committed = (await execFileAsync("git", ["show", `HEAD:${path}`], { cwd: repoDir, encoding: null, maxBuffer: 1024 * 1024 })).stdout; }
    catch { fail("PROOF_CHAIN_REPAIR_SET"); }
    const working = await readFile(path);
    if (!working.equals(committed)) fail("PROOF_CHAIN_REPAIR_SET");
  }
}
async function readFixedCommittedTuple(paths, repoDir = process.cwd()) {
  let fullCommit;
  try { fullCommit = (await execFileAsync("git", ["rev-parse", "HEAD^{commit}"], { cwd: repoDir, encoding: "utf8" })).stdout.trim(); }
  catch { fail("PROOF_CHAIN_COMMITTED"); }
  if (!/^[0-9a-f]{40}$/u.test(fullCommit)) fail("PROOF_CHAIN_COMMITTED");
  const values = [];
  for (const path of paths) {
    let canonical;
    try { canonical = (await execFileAsync("git", ["show", `${fullCommit}:${path}`], { cwd: repoDir, encoding: null, maxBuffer: 1024 * 1024 })).stdout; }
    catch { fail("PROOF_CHAIN_COMMITTED"); }
    let handle;
    try {
      handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      const before = await handle.stat({ bigint: true }); const working = await handle.readFile(); const after = await handle.stat({ bigint: true });
      if (!before.isFile() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || !working.equals(canonical)) fail("PROOF_CHAIN_COMMITTED");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(working);
      try { const parsed = JSON.parse(text); if (canonicalJson(parsed) !== text) fail("PROOF_CHAIN_COMMITTED"); values.push(parsed); }
      catch (error) { if (error instanceof Error && error.message === "PROOF_CHAIN_COMMITTED") throw error; values.push(evidence(text)); }
    } catch (error) {
      if (error instanceof Error && error.message === "PROOF_CHAIN_COMMITTED") throw error;
      fail("PROOF_CHAIN_COMMITTED");
    } finally { await handle?.close().catch(() => undefined); }
  }
  return { fullCommit, values };
}

function registryFromRecords(values, expected) {
  if (values.length !== expected.paths.length) fail("PROOF_CHAIN_ARGV");
  const offset = expected === BRANCH_AUTHORITY_REGISTRIES.live ? 5 : 1;
  const [forensic] = values;
  auditConsumedLiveArchive(forensic);
  const transition = values[offset]; const execution = values[offset + 1]; const proof = values[offset + 2]; const receipt = values[offset + 3];
  const branch = authenticatedBranch(transition);
  if (branch !== expected.branch) fail("PROOF_CHAIN_BRANCH");
  auditExecution(execution);
  if (branch === "preflight_started") auditPreflightProof(proof); else auditLiveProof(proof);
  validateTerminalOwnerReceipt(receipt);
  if (receipt.validation.execution !== "passed" || receipt.validation.proof !== "passed") fail("PROOF_CHAIN_LOCAL_VALIDATION");
  assertBranchExecution(branch, execution);
  if (transition.generation !== receipt.generation || execution.execution_generation !== receipt.generation
    || receipt.artifact_sha256.execution !== sha256Hex(Buffer.from(canonicalJson(execution)))
    || receipt.artifact_sha256.proof !== sha256Hex(Buffer.from(canonicalJson(proof)))
    || receipt.artifact_sha256.transition !== sha256Hex(Buffer.from(canonicalJson(transition)))
    || proof.execution_sha256 !== receipt.artifact_sha256.execution) fail("PROOF_CHAIN_IDENTITY");
  if (expected === BRANCH_AUTHORITY_REGISTRIES.live) {
    auditSourceAndReports(values[1], values[2], values[3]); auditBuildAuto(values[4]);
    if (proof.status !== (execution.status) || proof.outcome !== execution.outcome) fail("PROOF_CHAIN_IDENTITY");
  } else if (proof.status !== "gaps_found" || proof.outcome === "passed") fail("PROOF_CHAIN_BRANCH");
  return Object.freeze({ branch, registry_schema: expected.schema, status: proof.status });
}

export async function auditCommittedAuthority(modeName, repoDir = process.cwd()) {
  if (!["execution-committed-auto", "proof-committed-auto", "sync-authority-auto", "final-audit-auto"].includes(modeName)) fail("PROOF_CHAIN_ARGV");
  const transitionOnly = await readFixedCommittedTuple([transitionPath], repoDir);
  const branch = authenticatedBranch(transitionOnly.values[0]);
  const registry = branch === "preflight_started" ? BRANCH_AUTHORITY_REGISTRIES.preflight : BRANCH_AUTHORITY_REGISTRIES.live;
  const paths = modeName === "final-audit-auto" ? FINAL_AUDIT_REGISTRIES[branch === "preflight_started" ? "preflight" : "live"] : registry.paths;
  const committed = await readFixedCommittedTuple(paths, repoDir);
  const result = registryFromRecords(committed.values.slice(0, registry.paths.length), registry);
  return Object.freeze({ ...result, cardinality: paths.length, full_commit: committed.fullCommit });
}
async function main(argv) {
  const [mode, ...paths] = argv;
  if (["execution-auto", "proof-auto"].includes(mode)) fail("PROOF_CHAIN_LOCAL_OWNER");
  if (mode === "create-consumed-live-archive") {
    if (paths.length !== 0) fail("PROOF_CHAIN_ARGV");
    await createConsumedLiveArchive(); process.stdout.write(`${canonicalJson({ status: "gaps_found" })}\n`); return;
  }
  if (["execution-committed-auto", "proof-committed-auto", "sync-authority-auto", "final-audit-auto"].includes(mode)) {
    if (paths.length !== 0) fail("PROOF_CHAIN_ARGV");
    process.stdout.write(`${canonicalJson(await auditCommittedAuthority(mode))}\n`);
    return;
  }
  if (mode === "terminal-owner-receipt-auto") {
    if (paths.length !== 1 || paths[0] !== localValidationPath) fail("PROOF_CHAIN_ARGV");
    validateTerminalOwnerReceipt(await load(localValidationPath, true));
    process.stdout.write(`${canonicalJson({ status: "ready" })}\n`); return;
  }
  const specification = PROOF_CHAIN_MODES[mode];
  if (!specification || paths.length !== specification.paths.length || new Set(paths).size !== paths.length
    || paths.some((path, index) => path !== specification.paths[index])) fail("PROOF_CHAIN_ARGV");
  if (specification.committed) await assertCommittedInputs(paths);
  if (mode === "forensic-consumed-generation") await assertConsumedState();
  const records = await Promise.all(paths.map((path) => load(path, mode === "forensic-consumed-generation")));
  auditModeRecords(mode, records);
  if (mode !== "forensic-consumed-generation" && !consumedLiveArchiveModes.has(mode)) await Promise.all(records.map((record) => auditGitIdentity(record)));
  if (mode === "forensic-consumed-generation") {
    process.stdout.write(`${canonicalJson({ status: "gaps_found" })}\n`);
    return;
  }
  if (consumedLiveArchiveModes.has(mode)) {
    process.stdout.write(`${canonicalJson({ authority: false, status: "gaps_found" })}\n`); return;
  }
  if (mode === "build-auto") {
    process.stdout.write(`${canonicalJson(auditBuildAuto(records[0]))}\n`);
    return;
  }
  if (mode === "repair-set") {
    const result = auditRepairSet(records[0], records.slice(1));
    process.stdout.write(`${canonicalJson({ production_correction: result.production_correction, status: "ready" })}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then(() => {
    if (process.argv[2] !== "forensic-consumed-generation" && process.argv[2] !== "create-consumed-live-archive" && !consumedLiveArchiveModes.has(process.argv[2])) process.stdout.write("proof chain audit passed\n");
  }).catch((error) => {
    process.stderr.write(`${error instanceof Error && /^PROOF_CHAIN_/u.test(error.message) ? error.message : "PROOF_CHAIN_FAILED"}\n`);
    process.exitCode = 1;
  });
}
