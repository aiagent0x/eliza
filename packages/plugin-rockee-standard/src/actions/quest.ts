import {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    type Action,
} from "@elizaos/core";
import MessageService from "../services/messageService";
import CMSProvider from "../providers/CMS/cmsProvider";

const questTemplate = `Recent messages: {{recentMessages}}  

{{listProjects}}  

Extract the relevant project information from the conversation above, following these rules:  

- If the user is requesting a **list of quests** (e.g., "list quest", "list of quest"), set '"type": "list"' and return '"projectId": null' and '"projectName": null'.  
- If the user is requesting details about a **specific project or quest** (e.g., "quest of {Project_name}"), set '"type": "quest"' and return '"projectId": "151421514csdzc1qa14"' and '"projectName": "{Project_name}"'.  
- Only return details of **active** projects. If the project is inactive or the timeframe does not match the request, return 'null' for both '"projectId"' and '"projectName"'.  

Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined. The result should be a valid JSON object with the following schema:   

\`\`\`json
{
    "type": "list" | "quest",
    "projectId": string | null,
    "projectName": string | null
}
\`\`\``;

export const questInfo: Action = {
    name: "QUEST",
    similes: [
        "SHOW_QUEST",
        "QUEST_{QUEST_NAME}",
        "TASK",
        "TASK_{TASK_NAME}"
    ],

    examples: [
        [
            {
                "user": "{{user1}}",
                "content": {
                    "text": "Show me quest",
                    "action": "QUEST",

                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "Quest",
                    "action": "QUEST",

                }
            }
        ],

    ],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },

    description: "Fetches the latest list and details of quests. Select this action when the message includes queries like “quest of {project}” or similar.",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {

        let content: any = _options.data_extract;
        let currentState = state;
        let cmsProvider = new CMSProvider();
        let outputListProject = await cmsProvider.listProjects();
        console.log("outputListProject:", outputListProject)
        // if (_options.type !== "toggle_faster") {
        if (!currentState) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(state);
        }
        currentState.listProjects = outputListProject;
        const questInfoContext = composeContext({
            state: currentState,
            template: questTemplate,
        });
        console.log("questInfoContext:", questInfoContext);
        content = await generateObjectDeprecated({
            runtime,
            context: questInfoContext,
            modelClass: ModelClass.SMALL,
        });
        // }
        elizaLogger.info("content:", content);
        if (content.type === "list") {
            let listProjects = await cmsProvider.listProjectsV2();
            callback({
                user: await runtime.character.name,
                text: "Below is list of quest:",
                action: 'QUEST',
                result: {
                    type: "list_quest",
                    data: listProjects,
                    // action_hint: getActionHint()
                }
            });
            return true;
        }
        else {
            let projectDetail = await cmsProvider.projectDetail(content.projectId);
            callback({
                user: await runtime.character.name,
                text: `Detail quest ${content.projectName}`,
                action: 'QUEST',
                result: {
                    type: "quest",
                    data: projectDetail,
                    // action_hint: getActionHint()
                }
            });
            return true;
        }
        // if (_options.type !== "toggle_faster") {
        //     let messageService = new MessageService()
        //     await messageService.createMessage(
        //         message.content.text,
        //         {
        //             action: "QUEST",
        //             data_extract: content
        //         })
        // }
        // callback({
        //     user: await runtime.character.name,
        //     text: "hello",
        //     action: 'QUEST',
        //     result: {
        //         type: "quest",
        //         data: {
        //         },
        //         // action_hint: getActionHint()
        //     }
        // });

        // callback({
        //     user: await runtime.character.name,
        //     text: "hello",
        //     action: 'TASK',
        //     result: {
        //         type: "task_detail",
        //         data: {
        //         },
        //         // action_hint: getActionHint()
        //     }
        // });
        return true;



    }
}

