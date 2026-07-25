import { marshall } from "@aws-sdk/util-dynamodb";

export const generateItem = (entity: any) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: any[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};