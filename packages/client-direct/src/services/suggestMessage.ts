import {
    Memory,
    IAgentRuntime,
    elizaLogger,
    composeContext,
    State,
    ModelClass,
    generateObjectDeprecated,
} from "@elizaos/core";

const suggestMessageTemplate = `Generate multiple alternative phrasings for the following sentence while maintaining the same meaning and level of formality:

"Please select an action from the options below to proceed."

Rules:  
- The alternatives should be clear and concise.  
- Keep a polite and professional tone.  
- Ensure the meaning remains unchanged.  
- Provide at least 10 variations.  
- Output each variation as a JSON object in the following format:  
  { "responseMessage": "your variation here" }
`;


export async function suggestMessage(runtime: IAgentRuntime, message: Memory, state: State) {
    // elizaLogger.info("message:",message);
    // elizaLogger.info("state:",state);
    // if (!state) {
    //     state = (await runtime.composeState(message)) as State;
    // } else {
    //     state = await runtime.updateRecentMessageState(state);
    // }
    // const swapContext = composeContext({
    //     state,
    //     template: suggestMessageTemplate,
    // });
    // const content = await generateObjectDeprecated({
    //     runtime,
    //     context: swapContext,
    //     modelClass: ModelClass.SMALL,
    // });

    return {
        user: await runtime.character.name,
        text: `Please select an action from the options below to proceed.`,
        result: {
            type: "suggest_message",
            // data: content.responseMessage,
        }
    }
}