from typing import Set, Dict, Any, List

class RelationshipService:
    @staticmethod
    def classify_relationships(followers: Set[str], following: Set[str]) -> Dict[str, Any]:
        """
        Classifies relationship states into mutuals, following-only, and follower-only sets.
        """
        mutuals = followers.intersection(following)
        following_only = following.difference(followers)
        follower_only = followers.difference(following)

        return {
            "mutuals": list(mutuals),
            "not_following_back": list(following_only),
            "dont_follow_back": list(follower_only),
            "metrics": {
                "mutuals_count": len(mutuals),
                "not_following_back_count": len(following_only),
                "dont_follow_back_count": len(follower_only),
                "reciprocity_ratio": len(mutuals) / len(following) if following else 0.0
            }
        }

    @staticmethod
    def compute_deltas(prev_followers: Set[str], curr_followers: Set[str],
                       prev_following: Set[str], curr_following: Set[str]) -> Dict[str, List[str]]:
        """
        Computes set differences between two sequential snapshots.
        """
        return {
            "new_followers": list(curr_followers - prev_followers),
            "lost_followers": list(prev_followers - curr_followers),
            "new_following": list(curr_following - prev_following),
            "unfollowed": list(prev_following - curr_following),
        }
