import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import {
    type AgentRuntime,
    elizaLogger,
    getEnvVariable,
    type UUID,
    validateCharacterConfig,
    ServiceType,
    type Character,
    stringToUuid,
} from "@elizaos/core";
import { REST, Routes } from "discord.js";
import type { DirectClient } from ".";
import { validateUuid } from "@elizaos/core";
import listCharactorExample from "./controllers/agentControllers/listCharactorExample";
import validateInputCharacter from "./validate/validateCharacter";
const AGENTIDDEFAUT = "e61b079d-5226-06e9-9763-a33094aa8d82";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
interface UUIDParams {
    agentId: UUID;
    roomId?: UUID;
}

function validateUUIDParams(
    params: { agentId: string; roomId?: string },
    res: express.Response
): UUIDParams | null {
    const agentId = validateUuid(params.agentId);
    if (!agentId) {
        res.status(400).json({
            error: "Invalid AgentId format. Expected to be a UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        });
        return null;
    }

    if (params.roomId) {
        const roomId = validateUuid(params.roomId);
        if (!roomId) {
            res.status(400).json({
                error: "Invalid RoomId format. Expected to be a UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            });
            return null;
        }
        return { agentId, roomId };
    }

    return { agentId };
}

export function createApiRouter(
    agents: Map<string, AgentRuntime>,
    directClient: DirectClient
) {
    const router = express.Router();

    router.use(cors());
    router.use(bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(
        express.json({
            limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb",
        })
    );

    router.get("/", (req, res) => {
        res.send("Welcome, this is the REST API!");
    });

    router.get("/hello", (req, res) => {
        res.json({ message: "Hello World!" });
    });

    router.get("/agents", (req, res) => {
        const agentsList = Array.from(agents.values()).map((agent) => ({
            id: agent.agentId,
            name: agent.character.name,
            clients: Object.keys(agent.clients),
        }));
        res.json({ agents: agentsList });
    });

    router.get('/storage', async (req, res) => {
        try {
            const uploadDir = path.join(process.cwd(), "data", "characters");
            const files = await fs.promises.readdir(uploadDir);
            res.json({ files });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get("/agents/:agentId", (req, res) => {
        const { agentId } = validateUUIDParams(req.params, res) ?? {
            agentId: null,
        };
        if (!agentId) return;

        const agent = agents.get(agentId);

        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        const character = agent?.character;
        if (character?.settings?.secrets) {
            delete character.settings.secrets;
        }

        res.json({
            id: agent.agentId,
            character: agent.character,
        });
    });

    router.delete("/agents/:agentId", async (req, res) => {
        const { agentId } = validateUUIDParams(req.params, res) ?? {
            agentId: null,
        };
        if (!agentId) return;

        const agent: AgentRuntime = agents.get(agentId);

        if (agent) {
            agent.stop();
            directClient.unregisterAgent(agent);
            res.status(204).json({ success: true });
        } else {
            res.status(404).json({ error: "Agent not found" });
        }
    });

    router.post("/agents/:agentId/set", async (req, res) => {
        const { agentId } = validateUUIDParams(req.params, res) ?? {
            agentId: null,
        };
        if (!agentId) return;

        let agent: AgentRuntime = agents.get(agentId);

        // update character
        if (agent) {
            // stop agent
            agent.stop();
            directClient.unregisterAgent(agent);
            // if it has a different name, the agentId will change
        }

        // stores the json data before it is modified with added data
        const characterJson = { ...req.body };

        // load character from body
        const character = req.body;
        try {
            validateCharacterConfig(character);
        } catch (e) {
            elizaLogger.error(`Error parsing character: ${e}`);
            res.status(400).json({
                success: false,
                message: e.message,
            });
            return;
        }

        // start it up (and register it)
        try {
            agent = await directClient.startAgent(character);
            elizaLogger.log(`${character.name} started`);
        } catch (e) {
            elizaLogger.error(`Error starting agent: ${e}`);
            res.status(500).json({
                success: false,
                message: e.message,
            });
            return;
        }

        if (process.env.USE_CHARACTER_STORAGE === "true") {
            try {
                const filename = `${agent.agentId}.json`;
                const uploadDir = path.join(
                    process.cwd(),
                    "data",
                    "characters"
                );
                const filepath = path.join(uploadDir, filename);
                await fs.promises.mkdir(uploadDir, { recursive: true });
                await fs.promises.writeFile(
                    filepath,
                    JSON.stringify(
                        { ...characterJson, id: agent.agentId },
                        null,
                        2
                    )
                );
                elizaLogger.info(
                    `Character stored successfully at ${filepath}`
                );
            } catch (error) {
                elizaLogger.error(
                    `Failed to store character: ${error.message}`
                );
            }
        }

        res.json({
            id: character.id,
            character: character,
        });
    });
    // router.post("/agents/new", async (req, res) => {
    //     // load character from body

    //     const character = req.body;
    //     // const dataDir = path.join(__dirname, '../../../characters/data1');

    //     // await fs.promises.mkdir(dataDir, { recursive: true });
    //     // const files = await fs.promises.readdir(dataDir);
    //     // const existingCharacterFile = files.find(file => file.startsWith(`${stringToUuid(character.id)}.`) && file.endsWith('.character.json'));
    //     // if (existingCharacterFile) {
    //     //     res.status(400).json({
    //     //     message: "This name already exists, please choose a different name",
    //     //     });
    //     //     return;
    //     // }

    //     // try {
    //     //     validateCharacterConfig(character);
    //     //     const pathCharacter = `../../../characters/data1/${character.id}.character.json`;
    //     //     const  newCharacterPath= path.join(__dirname, pathCharacter);
    //     //     await fs.promises.writeFile(newCharacterPath, JSON.stringify(character, null, 2), 'utf8');

    //     // } catch (e) {
    //     //     elizaLogger.error(`Error parsing character: ${e}`);
    //     //     res.status(400).json({
    //     //         success: false,
    //     //         message: e.message,
    //     //     });
    //     //     return;
    //     // }

    //     // start it up (and register it)
    //     await directClient.startAgent(character);
    //     elizaLogger.info(`${character.name} started`);

    //     res.json({
    //         id: character.id,
    //         character: character,
    //     });
    // });
    router.post("/agents/new", async (req, res) => {
        const character = req.body;
        const parentId = character.parentId;
        const runtime = agents.get(AGENTIDDEFAUT);
        // let parentInfo = await runtime.databaseAdapter.getAccountInfo(parentId);
        let parentInfo = await runtime.databaseAdapter.getAgentSample(parentId)
        if (!parentInfo) {
            res.status(400).json({
                message: "Don't have parrentId"
            });
            return;
        }
        delete parentInfo._id;
        delete parentInfo.id;
        delete parentInfo.updatedAt;
        delete parentInfo.createdAt;
        delete parentInfo.name;
        parentInfo.name = character.name;
        parentInfo.parentId = parentId;
        
        let accountInfo = await runtime.databaseAdapter.createAgent(parentInfo, parentId);
        if (!accountInfo) {
            res.status(400).json({
                message: "Agent existed",
            });
            return;
        }
        res.status(200).json({
            message: "success",
            id: accountInfo.id,
            character: accountInfo,
        });
        return;
    })
    router.get("/agents/:agentId/channels", async (req, res) => {
        const { agentId } = validateUUIDParams(req.params, res) ?? {
            agentId: null,
        };
        if (!agentId) return;

        const runtime = agents.get(agentId);

        if (!runtime) {
            res.status(404).json({ error: "Runtime not found" });
            return;
        }

        const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN") as string;
        const rest = new REST({ version: "10" }).setToken(API_TOKEN);

        try {
            const guilds = (await rest.get(Routes.userGuilds())) as Array<any>;

            res.json({
                id: runtime.agentId,
                guilds: guilds,
                serverCount: guilds.length,
            });
        } catch (error) {
            console.error("Error fetching guilds:", error);
            res.status(500).json({ error: "Failed to fetch guilds" });
        }
    });

    router.get("/agents/:agentId/:roomId/memories", async (req, res) => {
        const { agentId, roomId } = validateUUIDParams(req.params, res) ?? {
            agentId: null,
            roomId: null,
        };
        console.log("agentId:", agentId);
        console.log("roomId:", roomId);
        if (!agentId || !roomId) return;

        let runtime = agents.get(agentId);

        // if runtime is null, look for runtime with the same name
        if (!runtime) {
            runtime = Array.from(agents.values()).find(
                (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
            );
        }

        if (!runtime) {
            res.status(404).send("Agent not found");
            return;
        }

        try {
            const memories = await runtime.messageManager.getMemories({
                roomId,
                count: 10
            });
            console.log("memories:", memories)
            const response = {
                agentId,
                roomId,
                memories: memories.map((memory) => ({
                    id: memory.id,
                    userId: memory.userId,
                    agentId: memory.agentId,
                    createdAt: memory.createdAt,
                    content: {
                        text: memory.content.text,
                        action: memory.content.action,
                        source: memory.content.source,
                        url: memory.content.url,
                        inReplyTo: memory.content.inReplyTo,
                        attachments: memory.content.attachments?.map(
                            (attachment) => ({
                                id: attachment.id,
                                url: attachment.url,
                                title: attachment.title,
                                source: attachment.source,
                                description: attachment.description,
                                text: attachment.text,
                                contentType: attachment.contentType,
                            })
                        ),
                    },
                    embedding: memory.embedding,
                    roomId: memory.roomId,
                    unique: memory.unique,
                    similarity: memory.similarity,
                })),
            };

            res.json(response);
        } catch (error) {
            console.error("Error fetching memories:", error);
            res.status(500).json({ error: "Failed to fetch memories" });
        }
    });

    // router.post("/agent/start", async (req, res) => {
    //     const { characterPath, characterJson } = req.body;
    //     console.log("characterPath:", characterPath);
    //     console.log("characterJson:", characterJson);
    //     try {
    //         let character: Character;
    //         if (characterJson) {
    //             character = await directClient.jsonToCharacter(
    //                 characterPath,
    //                 characterJson
    //             );
    //         } else if (characterPath) {
    //             character =
    //                 await directClient.loadCharacterTryPath(characterPath);
    //         } else {
    //             throw new Error("No character path or JSON provided");
    //         }
    //         await directClient.startAgent(character);
    //         elizaLogger.log(`${character.name} started`);

    //         res.json({
    //             id: character.id,
    //             character: character,
    //         });
    //     } catch (e) {
    //         elizaLogger.error(`Error parsing character: ${e}`);
    //         res.status(400).json({
    //             error: e.message,
    //         });
    //         return;
    //     }
    // });

    router.post("/agents/:agentId/stop", async (req, res) => {
        const agentId = req.params.agentId;
        console.log("agentId", agentId);
        const agent: AgentRuntime = agents.get(agentId);

        // update character
        if (agent) {
            // stop agent
            agent.stop();
            directClient.unregisterAgent(agent);
            // if it has a different name, the agentId will change
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Agent not found" });
        }
    });
    router.post("/agents/new2", async (req, res) => {

        const { sampleAgentId, name, adjectives, bio, lore, knowledge, style, plugins, clients, modelProvider, settings } = req.body;

        const mapDataPath = path.join(__dirname, '../../../characters/samples/mapData.json');
        let sampleAgents;
        const dataDir = path.join(__dirname, '../../../characters/data');
        await fs.promises.mkdir(dataDir, { recursive: true });
        const files = await fs.promises.readdir(dataDir);
        const existingCharacterFile = files.find(file => file.startsWith(`${stringToUuid(name)}.`) && file.endsWith('.character.json'));
        if (existingCharacterFile) {
            res.status(400).json({
                message: "This name already exists, please choose a different name",
            });
            return;
        }
        try {
            const data = await fs.promises.readFile(mapDataPath, 'utf8');
            sampleAgents = JSON.parse(data);
        } catch (readErr) {
            elizaLogger.info('error read file mapData.json:', readErr);
        }
        let sampleAgentInfo = Array.isArray(sampleAgents) ? sampleAgents.find((e) => e.id === sampleAgentId) : null;
        const agentSamplePath = path.join(__dirname, `../../../characters/samples/${sampleAgentInfo.name}.character.json`);
        let sampleAgentCharacterData;
        let sampleAgentWriteFile;
        const data = await fs.promises.readFile(agentSamplePath, 'utf8');
        sampleAgentCharacterData = JSON.parse(data);

        sampleAgentWriteFile = sampleAgentCharacterData

        sampleAgentCharacterData.name = name;
        sampleAgentWriteFile.name = name;
        sampleAgentCharacterData.adjectives = adjectives;
        sampleAgentWriteFile.adjectives = adjectives;
        sampleAgentCharacterData.bio = bio;
        sampleAgentWriteFile.bio = bio;
        sampleAgentCharacterData.lore = lore;
        sampleAgentWriteFile.lore = lore;
        sampleAgentCharacterData.knowledge = knowledge;
        sampleAgentWriteFile.knowledge = knowledge;
        sampleAgentCharacterData.knowledge = style;
        sampleAgentWriteFile.knowledge = style;


        validateCharacterConfig(sampleAgentCharacterData);

        // start it up (and register it)
        const pathCharacter = `../../../characters/data/${Date.now()}.${sampleAgentInfo.name}.character.json`;
        const newCharacterPath = path.join(__dirname, pathCharacter);
        await fs.promises.writeFile(newCharacterPath, JSON.stringify(sampleAgentWriteFile, null, 2), 'utf8');

        await directClient.startAgent(sampleAgentCharacterData);
        // elizaLogger.info('sampleAgentWriteFile:', sampleAgentWriteFile);
        elizaLogger.info(`${sampleAgentCharacterData.name} started`);
        const newCharacterPathWithId = path.join(__dirname, `../../../characters/data/${sampleAgentCharacterData.id}.${sampleAgentInfo.name}.character.json`);
        await fs.promises.rename(newCharacterPath, newCharacterPathWithId);

        // Update mapData.json with new character
        sampleAgents.push({
            id: sampleAgentCharacterData.id,
            name: sampleAgentCharacterData.name,
        });

        const updatedSampleAgents = sampleAgents.map(agent => {
            if (agent.id === sampleAgentId) {
                return {
                    ...agent,
                    clone: [...(agent.clone || []), sampleAgentCharacterData.id]
                };
            }
            return agent;
        });
        await fs.promises.writeFile(mapDataPath, JSON.stringify(updatedSampleAgents, null, 2), 'utf8');
        elizaLogger.info(`mapData.json updated with new character`);

        res.json({
            id: sampleAgentCharacterData.id,
            character: sampleAgentCharacterData,
        });
    });
    router.post("/agents/v3/new", async (req, res) => {
        const character = req.body;
        try {
            validateCharacterConfig(character);
            await directClient.startAgent(character);
            elizaLogger.info(`${character.name} started`);
            res.json({
                id: character.id,
                character: character,
            });
        } catch (error) {
            console.log("new-agents:", error)
        }

    })
    router.post("/agents/plugins", async (req, res) => {
        const packagesPath = path.join(__dirname, '../../../packages');
        try {
            const packageFolders = await fs.promises.readdir(packagesPath, { withFileTypes: true });
            const moduleNames = packageFolders
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
                .filter(name => !name.startsWith('adapter-') && !['core',
                    'debug-audio',
                    'create-eliza-app',
                    '_examples',
                    'content_cache',
                    'plugin-nvidia-nim',
                    'plugin-tee',
                    'plugin-tee-log',
                    'plugin-tee-marlin',
                    'plugin-tee-verifiable-log',
                    'plugin-node',
                    "debug_audio",
                    "plugin-0g",
                    "plugin-0x",
                    "client-auto",
                    "client-deva",
                    "client-direct",
                    "client-eliza-home",
                    "client-github",
                    "client-lens",
                    "client-simsai",
                    "plugin-agentkit",
                    "plugin-bootstrap",
                    "plugin-asterai",
                ].includes(name));

            res.status(200).json({ plugins: moduleNames });
        } catch (error) {
            console.error("Error fetching modules:", error);
            res.status(500).json({ error: "Failed to fetch modules" });
        }
    })
    router.post("/agents/start", async (req, res) => {
        const { agentId } = req.body;
        try {
            const runtimeDefault = agents.get(AGENTIDDEFAUT);
            const accountInfo = await runtimeDefault.databaseAdapter.getAccountInfo(agentId)
            const character = JSON.parse(accountInfo.details);
            validateCharacterConfig(character);
            // start it up (and register it)
            await directClient.startAgent(character);
            elizaLogger.info(`${character.name} started`);

            res.json({
                id: character.id,
                character: character,
            });
        } catch (error) {
            elizaLogger.error(`Error starting agent: ${error}`);
            res.status(404).json({
                success: false,
                message: "Character file not found",
            });
        }
    })
    router.post("/agents/examples", async (req, res) => {
        const runtimeDefault = agents.get(AGENTIDDEFAUT);
        let agentsSample = await runtimeDefault.databaseAdapter.getAgentsSample()
        res.status(200).json({
            message: "success",
            data: agentsSample,
        });
    })
    router.post("/agents/stringToUuid", async (req, res) => {
        let { text } = req.body
        res.status(200).json({
            success: false,
            message: stringToUuid(text),
        });
    })
    router.post("/agent-samples/new", async (req, res) => {
        const character = req.body;
        try {
            const validateData = await validateInputCharacter(character);
            if (validateData === false) {
                res.status(400).json({
                    message: "Please check the information to ensure that nothing is missing: name, clients, modelProvider, settings, plugins, bio, lore, knowledge, messageExamples, postExamples, topics, style, and adjectives."
                });
                return;
            }
            const runtimeDefault = agents.get(AGENTIDDEFAUT);
            await runtimeDefault.databaseAdapter.createAgentSample(character);
            res.status(200).json({
                message: "success",
            })
            return;
        } catch (error) {
            console.error(`Error create sample agent: ${error}`);
            // console.log(error)
            switch (error.message) {
                
                case "AGENT_EXISTED":
                    res.status(404).json({
                        success: "fail",
                        message: "Agent already exists, please change the agent's name.",
                    });
                    return;
                    break;
                default:
                    res.status(404).json({
                        success: "fail",
                        message: "Create sample agent error",
                    });
                    return;
                    break;
            }

        }
    })
    router.get("/agent-samples", async (req, res) => {
        try {
            const runtimeDefault = agents.get(AGENTIDDEFAUT);
            const agentsSample = await runtimeDefault.databaseAdapter.getAgentsSample();

            res.status(200).json({
                message: "success",
                data: agentsSample
            })
            return;
        } catch (error) {
            elizaLogger.error(`Error list sample agent: ${error}`);
            res.status(404).json({
                success: false,
                message: "get list sample-agent fail",
            });
            return;
        }
    })
    router.post("/agent-samples/set", async (req, res) => {
        try {
            const character = req.body;
            const validateData = await validateInputCharacter(character);
            if (validateData === false) {
                res.status(400).json({
                    message: "Please check the information to ensure that nothing is missing: name, clients, modelProvider, settings, plugins, bio, lore, knowledge, messageExamples, postExamples, topics, style, and adjectives."
                });
                return;
            }
            const runtimeDefault = agents.get(AGENTIDDEFAUT);
            await runtimeDefault.databaseAdapter.updateAgentSample(character);
            res.status(200).json({
                message: "success"
            });
            return;
        } catch (error) {
            switch (error.message) {
                case "SAMPLE_AGENT_EXISTED":
                    res.status(404).json({
                        message: "Sample agent existed",
                    })
                    return;
                    break;

                default:
                    console.log("Error set sample agent:", error)
                    res.status(404).json({
                        message: "Set sample agent error:",
                    })
                    return;
                    break;
            }
        }
    })
    return router;
}
