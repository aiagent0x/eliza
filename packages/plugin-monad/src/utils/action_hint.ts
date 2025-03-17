export default function getActionHint(actionHintText: string = "Do you need any further assistance? Please let me know!", type?: string, protocol?: string) {

    if (type === "button_generate_text") {
        switch (protocol) {
            case "navi":
                return {
                    text: actionHintText,
                    actions: [
                        {
                            type: "button_generate_text",
                            text: "Navi pools",

                        },
                    ]
                }
                break;
            case "scallop":
                return {
                    text: actionHintText,
                    actions: [
                        {
                            type: "button_generate_text",
                            text: "Scallop pools",

                        },
                    ]
                }
                break;
            case "suilend":
                return {
                    text: actionHintText,
                    actions: [
                        {
                            type: "button_generate_text",
                            text: "Suilend pools",
                        },
                    ]
                }
                break;

            default:
                return {
                    text: actionHintText,
                    actions: [
                        {
                            type: "button_generate_text",
                            text: "Navi pools",

                        },
                        {
                            type: "button_generate_text",
                            text: "Scallop pools",

                        },
                        {
                            type: "button_generate_text",
                            text: "Suilend pools",
                        },
                    ]
                }
                break;
        }
    }
    else {
        return {
            text: actionHintText,
            actions: [
                {
                    type: "button_buy",
                    text: "Buy ROCK",
                    data: {
                        type: "0xb4bc93ad1a07fe47943fc4d776fed31ce31923acb5bc9f92d2cab14d01fc06a4::ROCK::ROCK",
                        icon_url: "https://rockee.ai/images/logo.png"
                    }
                },
                {
                    type: "button_buy",
                    text: "Buy SUI",
                    data: {
                        type: "0x2::sui::SUI",
                        icon_url: "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png"
                    }
                }
            ]
        }
    }

}